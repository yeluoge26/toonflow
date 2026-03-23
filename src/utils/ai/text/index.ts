import u from "@/utils";
import { generateText, streamText, Output, stepCountIs, ModelMessage, LanguageModel, Tool, GenerateTextResult } from "ai";
import { wrapLanguageModel } from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { parse } from "best-effort-json-parser";
import { getModelList } from "./modelList";
import { z } from "zod";
import { OpenAIProvider } from "@ai-sdk/openai";
import { trackModelUsage } from "@/utils/getPromptAi";

interface AIInput<T extends Record<string, z.ZodTypeAny> | undefined = undefined> {
  system?: string;
  tools?: Record<string, Tool>;
  maxStep?: number;
  output?: T;
  prompt?: string;
  messages?: Array<ModelMessage>;
}

interface AIConfig {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  manufacturer?: string;
  configId?: number;
  fallbacks?: AIConfig[];
  moduleKey?: string;
}

const buildOptions = async (input: AIInput<any>, config: AIConfig = {}) => {
  if (!config || !config?.model || !config?.apiKey || !config?.manufacturer) throw new Error("请检查模型配置是否正确");
  const { model, apiKey, baseURL, manufacturer } = { ...config };
  let owned;
  const modelList = await getModelList();
  if (manufacturer == "other") {
    owned = modelList.find((m) => m.manufacturer === manufacturer);
  } else {
    owned = modelList.find((m) => m.model === model && m.manufacturer === manufacturer);
    if (!owned) owned = modelList.find((m) => m.manufacturer === manufacturer);
  }
  if (!owned) throw new Error("不支持的厂商");

  const modelInstance = owned.instance({ apiKey: apiKey!, baseURL: baseURL! });

  const maxStep = input.maxStep ?? (input.tools ? Object.keys(input.tools).length * 5 : undefined);
  const outputBuilders: Record<string, (schema: any) => any> = {
    schema: (s) => {
      const schemaPrompt = `\n请按照以下 schema 格式返回结果:\n${JSON.stringify(
        z.toJSONSchema(z.object(s)),
        null,
        2,
      )}\n请输出JSON格式，只返回结果，不要将Schema返回。`;
      input.system = (input.system ?? "") + schemaPrompt;
      return Output.object({ schema: z.object(s) });
    },
    object: () => {
      const jsonSchemaPrompt = `\n请按照以下 JSON Schema 格式返回结果:\n${JSON.stringify(
        z.toJSONSchema(z.object(input.output)),
        null,
        2,
      )}\n请输出JSON格式，只返回结果，不要将Schema返回。`;
      input.system = (input.system ?? "") + jsonSchemaPrompt;
    },
  };

  const output = input.output ? (outputBuilders[owned.responseFormat]?.(input.output) ?? null) : null;
  const chatModelManufacturer = ["volcengine", "other", "openai", "modelScope", "grsai", "formal"];
  const modelFn = chatModelManufacturer.includes(owned.manufacturer) ? (modelInstance as OpenAIProvider).chat(model!) : modelInstance(model!);

  return {
    config: {
      model: modelFn as LanguageModel,
      maxTokens: 32768,
      ...(input.system && { system: input.system }),
      ...(input.prompt ? { prompt: input.prompt } : { messages: input.messages! }),
      ...(input.tools && owned.tool && { tools: input.tools }),
      ...(maxStep && { stopWhen: stepCountIs(maxStep) }),
      ...(output && { output }),
    },
    responseFormat: owned.responseFormat,
  };
};

type InferOutput<T> = T extends Record<string, z.ZodTypeAny> ? z.infer<z.ZodObject<T>> : GenerateTextResult<Record<string, Tool>, never>;

const ai = Object.create({}) as {
  invoke<T extends Record<string, z.ZodTypeAny> | undefined = undefined>(input: AIInput<T>, config?: AIConfig): Promise<InferOutput<T>>;
  stream(input: AIInput, config?: AIConfig): Promise<ReturnType<typeof streamText>>;
};

ai.invoke = async (input: AIInput<any>, config: AIConfig) => {
  const configs = [config, ...(config.fallbacks || [])];
  let lastError: Error | null = null;

  for (let i = 0; i < configs.length; i++) {
    const currentConfig = configs[i];
    const startTime = Date.now();
    try {
      const options = await buildOptions(input, currentConfig);
      const result = await generateText(options.config);

      // Track successful usage
      trackModelUsage({
        configId: currentConfig.configId,
        manufacturer: currentConfig.manufacturer,
        model: currentConfig.model,
        moduleKey: config.moduleKey,
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
        duration: Date.now() - startTime,
        status: "success",
      });

      if (options.responseFormat === "object" && input.output) {
        const pattern = /{[^{}]*}|{(?:[^{}]*|{[^{}]*})*}/g;
        const jsonLikeTexts = Array.from(result.text.matchAll(pattern), (m) => m[0]);
        const res = jsonLikeTexts.map((jsonText) => parse(jsonText));
        return res[0];
      }
      if (options.responseFormat === "schema" && input.output) {
        return JSON.parse(result.text);
      }
      return result;
    } catch (err: any) {
      lastError = err;
      // Track failed usage
      trackModelUsage({
        configId: currentConfig.configId,
        manufacturer: currentConfig.manufacturer,
        model: currentConfig.model,
        moduleKey: config.moduleKey,
        duration: Date.now() - startTime,
        status: "failed",
        errorMsg: err.message?.substring(0, 200),
      });

      if (i < configs.length - 1) {
        console.warn(`[AI Fallback] ${currentConfig.manufacturer}/${currentConfig.model} failed: ${err.message?.substring(0, 80)}, trying fallback ${i + 2}...`);
      }
    }
  }
  throw lastError || new Error("所有模型均调用失败");
};

ai.stream = async (input: AIInput, config: AIConfig) => {
  const configs = [config, ...(config.fallbacks || [])];
  let lastError: Error | null = null;

  for (let i = 0; i < configs.length; i++) {
    const currentConfig = configs[i];
    const startTime = Date.now();
    try {
      const options = await buildOptions(input, currentConfig);
      const result = streamText(options.config);

      // Track usage (stream - we can't get exact tokens, track as started)
      trackModelUsage({
        configId: currentConfig.configId,
        manufacturer: currentConfig.manufacturer,
        model: currentConfig.model,
        moduleKey: config.moduleKey,
        duration: 0,
        status: "streaming",
      });

      return result;
    } catch (err: any) {
      lastError = err;
      trackModelUsage({
        configId: currentConfig.configId,
        manufacturer: currentConfig.manufacturer,
        model: currentConfig.model,
        moduleKey: config.moduleKey,
        duration: Date.now() - startTime,
        status: "failed",
        errorMsg: err.message?.substring(0, 200),
      });

      if (i < configs.length - 1) {
        console.warn(`[AI Fallback] ${currentConfig.manufacturer}/${currentConfig.model} stream failed, trying fallback ${i + 2}...`);
      }
    }
  }
  throw lastError || new Error("所有模型均调用失败");
};

export default ai;
