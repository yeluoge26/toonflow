import { db } from "./db";

interface AiConfig {
  model?: string;
  apiKey: string;
  baseURL?: string;
  manufacturer: string;
  configId?: number;
}

interface AiConfigWithFallback extends AiConfig {
  fallbacks?: AiConfig[];
  moduleKey?: string;
}

async function getConfigById(configId: number): Promise<AiConfig | null> {
  const row = await db("t_config")
    .where("id", configId)
    .select("id as configId", "model", "apiKey", "baseUrl as baseURL", "manufacturer")
    .first();
  return row || null;
}

export default async function getPromptAi(key: string): Promise<AiConfigWithFallback | {}> {
  const mapRow = await db("t_aiModelMap")
    .where("key", key)
    .select("configId", "configId2", "configId3")
    .first();

  if (!mapRow || !mapRow.configId) return {};

  const primary = await getConfigById(mapRow.configId);
  if (!primary) return {};

  const result: AiConfigWithFallback = { ...primary, moduleKey: key, fallbacks: [] };

  // Load fallback configs
  if (mapRow.configId2) {
    const fb2 = await getConfigById(mapRow.configId2);
    if (fb2) result.fallbacks!.push(fb2);
  }
  if (mapRow.configId3) {
    const fb3 = await getConfigById(mapRow.configId3);
    if (fb3) result.fallbacks!.push(fb3);
  }

  return result;
}

/**
 * Record model usage for tracking and cost control
 */
export async function trackModelUsage(params: {
  configId?: number;
  manufacturer?: string;
  model?: string;
  moduleKey?: string;
  inputTokens?: number;
  outputTokens?: number;
  duration?: number;
  cost?: number;
  status?: string;
  errorMsg?: string;
}) {
  try {
    await db("t_modelUsage").insert({
      configId: params.configId || 0,
      manufacturer: params.manufacturer || "",
      model: params.model || "",
      moduleKey: params.moduleKey || "",
      inputTokens: params.inputTokens || 0,
      outputTokens: params.outputTokens || 0,
      duration: params.duration || 0,
      cost: params.cost || 0,
      status: params.status || "success",
      errorMsg: params.errorMsg || null,
      createdAt: Date.now(),
    });
  } catch (e) {
    // Don't let tracking errors break the main flow
    console.error("[ModelUsage] tracking error:", e);
  }
}
