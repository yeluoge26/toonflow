import u from "@/utils";
import { validateScript, generateRewritePrompt, ValidationResult } from "./scriptValidator";

interface GenerateConfig {
  promptText: string;        // The evolved prompt or template prompt
  style?: string;            // 'shuangwen' | 'emotion' | 'suspense'
  maxRewrites?: number;      // max auto-rewrite attempts (default 2)
  minScore?: number;         // minimum validation score to accept
}

interface GenerateResult {
  content: string;
  validation: ValidationResult;
  rewrites: number;
  accepted: boolean;
}

// Generate a script with auto-validation and rewrite
export async function autoGenerateScript(config: GenerateConfig): Promise<GenerateResult> {
  const { promptText, style, maxRewrites = 2 } = config;

  // Get AI config
  const promptAi = await u.getPromptAi("generateScript") as any;
  if (!promptAi?.config) {
    throw new Error("未配置剧本生成AI模型");
  }

  // Load base system prompt
  const basePrompt = await u.db("t_prompts").where("code", "script").first();
  let systemPrompt = (basePrompt?.customValue || basePrompt?.defaultValue || "") as string;

  // Load style prompt if specified
  if (style) {
    const stylePrompt = await u.db("t_prompts").where("code", `script-style-${style}`).first();
    if (stylePrompt) {
      systemPrompt += "\n\n" + ((stylePrompt.customValue || stylePrompt.defaultValue) as string);
    }
  }

  // Add viral optimization rules
  systemPrompt += `\n\n## 爆款强制规则
1. 前3秒必须有让人停不下来的钩子（强冲突/悬念/震惊对白）
2. 必须有至少2次情绪变化
3. 必须有反转
4. 结尾必须是强情绪+【黑屏】
5. 整体时长控制在30-60秒阅读量`;

  let content = "";
  let validation: ValidationResult = {
    valid: false, hasHook: false, hasConflict: false, hasTwist: false,
    emotionChanges: 0, hasStrongEnding: false, issues: [], suggestions: [],
  };
  let rewrites = 0;

  // First generation
  try {
    const result = await (u.ai.text as any).invoke({
      config: promptAi.config,
      system: systemPrompt,
      prompt: promptText,
    });
    content = typeof result === "string" ? result : String(result);
  } catch (err: any) {
    throw new Error(`剧本生成失败: ${err.message}`);
  }

  // Validate
  validation = validateScript(content);

  // Auto-rewrite loop
  while (!validation.valid && rewrites < maxRewrites) {
    rewrites++;
    const rewritePrompt = generateRewritePrompt(validation);

    try {
      const result = await (u.ai.text as any).invoke({
        config: promptAi.config,
        system: systemPrompt,
        prompt: `原始剧本：\n${content}\n\n${rewritePrompt}`,
      });
      content = typeof result === "string" ? result : String(result);
      validation = validateScript(content);
    } catch (err) {
      break; // Stop rewriting on error
    }
  }

  return {
    content,
    validation,
    rewrites,
    accepted: validation.valid,
  };
}

// Batch generate scripts from genomes
export async function batchGenerateScripts(
  prompts: Array<{ id: string; text: string; style?: string }>,
  maxRewrites: number = 2
): Promise<Array<{ id: string; result: GenerateResult }>> {
  const results: Array<{ id: string; result: GenerateResult }> = [];

  for (const prompt of prompts) {
    try {
      const result = await autoGenerateScript({
        promptText: prompt.text,
        style: prompt.style,
        maxRewrites,
      });
      results.push({ id: prompt.id, result });
    } catch (err: any) {
      results.push({
        id: prompt.id,
        result: {
          content: "",
          validation: {
            valid: false, hasHook: false, hasConflict: false, hasTwist: false,
            emotionChanges: 0, hasStrongEnding: false,
            issues: [`生成失败: ${err.message}`], suggestions: [],
          },
          rewrites: 0,
          accepted: false,
        },
      });
    }
  }

  return results;
}
