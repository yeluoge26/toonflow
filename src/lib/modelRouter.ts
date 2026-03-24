// Model Router - Intelligent model selection based on task type, quality, and cost
import u from "@/utils";

// ==================== Type Definitions ====================

export interface ModelSelection {
  provider: string; // gemini | sd | modelScope | kling | wan | sora
  model: string;
  reason: string;
  estimatedCost: number;
  estimatedTime: number; // seconds
}

export interface RoutingConfig {
  preferQuality: boolean; // true = best quality, false = fastest/cheapest
  maxCost: number; // max cost per generation
  maxTime: number; // max wait time in seconds
  availableProviders: string[];
}

interface ModelSpec {
  provider: string;
  model: string;
  type: "text" | "image" | "video";
  quality: number; // 0-100
  speed: number; // 0-100 (higher = faster)
  costPer1k: number; // cost per 1k tokens/images/seconds
  estimatedTime: number; // avg generation time in seconds
  supportsImageInput?: boolean;
  maxResolution?: string;
  specialties?: string[];
}

// ==================== Model Registry ====================

const MODEL_REGISTRY: ModelSpec[] = [
  // Text models
  {
    provider: "gemini",
    model: "gemini-2.0-flash",
    type: "text",
    quality: 80,
    speed: 95,
    costPer1k: 0.0001,
    estimatedTime: 2,
    specialties: ["fast-response", "general", "code"],
  },
  {
    provider: "gemini",
    model: "gemini-2.5-pro",
    type: "text",
    quality: 95,
    speed: 60,
    costPer1k: 0.007,
    estimatedTime: 8,
    specialties: ["reasoning", "creative", "analysis"],
  },
  {
    provider: "openai",
    model: "gpt-4o",
    type: "text",
    quality: 92,
    speed: 70,
    costPer1k: 0.005,
    estimatedTime: 5,
    specialties: ["general", "creative", "code"],
  },
  {
    provider: "openai",
    model: "gpt-4o-mini",
    type: "text",
    quality: 78,
    speed: 90,
    costPer1k: 0.00015,
    estimatedTime: 2,
    specialties: ["fast-response", "general"],
  },
  {
    provider: "deepseek",
    model: "deepseek-chat",
    type: "text",
    quality: 82,
    speed: 85,
    costPer1k: 0.0002,
    estimatedTime: 3,
    specialties: ["general", "chinese", "code"],
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    type: "text",
    quality: 93,
    speed: 65,
    costPer1k: 0.003,
    estimatedTime: 6,
    specialties: ["creative", "analysis", "reasoning"],
  },

  // Image models
  {
    provider: "sd",
    model: "stable-diffusion-xl",
    type: "image",
    quality: 80,
    speed: 85,
    costPer1k: 0.02,
    estimatedTime: 8,
    maxResolution: "1024x1024",
    specialties: ["general", "artistic", "fast"],
  },
  {
    provider: "sd",
    model: "stable-diffusion-3",
    type: "image",
    quality: 88,
    speed: 70,
    costPer1k: 0.035,
    estimatedTime: 15,
    maxResolution: "1536x1536",
    specialties: ["photorealistic", "artistic", "text-in-image"],
  },
  {
    provider: "modelScope",
    model: "flux-dev",
    type: "image",
    quality: 90,
    speed: 60,
    costPer1k: 0.05,
    estimatedTime: 20,
    maxResolution: "2048x2048",
    specialties: ["photorealistic", "high-detail", "character"],
  },
  {
    provider: "gemini",
    model: "imagen-3",
    type: "image",
    quality: 92,
    speed: 65,
    costPer1k: 0.04,
    estimatedTime: 12,
    maxResolution: "2048x2048",
    specialties: ["photorealistic", "artistic", "prompt-following"],
  },

  // Video models
  {
    provider: "kling",
    model: "kling-v1",
    type: "video",
    quality: 85,
    speed: 40,
    costPer1k: 0.5,
    estimatedTime: 120,
    supportsImageInput: true,
    specialties: ["image-to-video", "character-motion", "short-form"],
  },
  {
    provider: "kling",
    model: "kling-v2",
    type: "video",
    quality: 92,
    speed: 30,
    costPer1k: 0.8,
    estimatedTime: 180,
    supportsImageInput: true,
    specialties: ["image-to-video", "high-quality", "cinematic"],
  },
  {
    provider: "wan",
    model: "wan-2.1",
    type: "video",
    quality: 88,
    speed: 50,
    costPer1k: 0.3,
    estimatedTime: 90,
    supportsImageInput: true,
    specialties: ["text-to-video", "image-to-video", "fast"],
  },
  {
    provider: "sora",
    model: "sora-turbo",
    type: "video",
    quality: 95,
    speed: 25,
    costPer1k: 1.0,
    estimatedTime: 240,
    supportsImageInput: true,
    specialties: ["cinematic", "high-quality", "long-form", "physics"],
  },
  {
    provider: "modelScope",
    model: "cogvideox",
    type: "video",
    quality: 82,
    speed: 55,
    costPer1k: 0.2,
    estimatedTime: 60,
    supportsImageInput: false,
    specialties: ["text-to-video", "fast", "cost-effective"],
  },
];

// ==================== Task Type Mappings ====================

const TEXT_TASK_REQUIREMENTS: Record<
  string,
  { minQuality: number; specialties: string[] }
> = {
  script_generation: { minQuality: 85, specialties: ["creative"] },
  outline_generation: { minQuality: 80, specialties: ["creative", "analysis"] },
  prompt_optimization: { minQuality: 75, specialties: ["creative"] },
  translation: { minQuality: 70, specialties: ["general"] },
  analysis: { minQuality: 85, specialties: ["analysis", "reasoning"] },
  chat: { minQuality: 60, specialties: ["general", "fast-response"] },
  code: { minQuality: 80, specialties: ["code"] },
  review: { minQuality: 80, specialties: ["analysis"] },
  summary: { minQuality: 70, specialties: ["general"] },
};

// ==================== Scoring Engine ====================

function scoreModel(
  model: ModelSpec,
  config: RoutingConfig,
  requirements?: { minQuality?: number; specialties?: string[] },
): number {
  let score = 0;

  // Filter: must be from available providers
  if (
    config.availableProviders.length > 0 &&
    !config.availableProviders.includes(model.provider)
  ) {
    return -1;
  }

  // Filter: must be within cost budget
  if (config.maxCost > 0 && model.costPer1k > config.maxCost) {
    return -1;
  }

  // Filter: must be within time budget
  if (config.maxTime > 0 && model.estimatedTime > config.maxTime) {
    return -1;
  }

  // Filter: must meet minimum quality
  if (requirements?.minQuality && model.quality < requirements.minQuality) {
    return -1;
  }

  // Quality vs Speed weighting
  if (config.preferQuality) {
    score += model.quality * 2.0; // Quality matters more
    score += model.speed * 0.5;
  } else {
    score += model.quality * 0.8;
    score += model.speed * 1.5; // Speed matters more
    // Bonus for low cost when not preferring quality
    score += Math.max(0, 50 - model.costPer1k * 1000);
  }

  // Specialty matching bonus
  if (requirements?.specialties) {
    const matchCount = requirements.specialties.filter((s) =>
      model.specialties?.includes(s),
    ).length;
    score += matchCount * 15;
  }

  return score;
}

function selectBestModel(
  models: ModelSpec[],
  config: RoutingConfig,
  requirements?: { minQuality?: number; specialties?: string[] },
): ModelSpec | null {
  let bestModel: ModelSpec | null = null;
  let bestScore = -1;

  for (const model of models) {
    const score = scoreModel(model, config, requirements);
    if (score > bestScore) {
      bestScore = score;
      bestModel = model;
    }
  }

  return bestModel;
}

function buildReason(model: ModelSpec, config: RoutingConfig): string {
  const reasons: string[] = [];

  if (config.preferQuality) {
    reasons.push(`highest quality (${model.quality}/100)`);
  } else {
    reasons.push(`best speed/cost ratio`);
  }

  if (model.specialties?.length) {
    reasons.push(`specializes in ${model.specialties.slice(0, 2).join(", ")}`);
  }

  reasons.push(`~${model.estimatedTime}s generation time`);

  return reasons.join("; ");
}

// ==================== Core Functions ====================

/**
 * Select best model for image generation
 */
export function selectImageModel(
  prompt: string,
  config: RoutingConfig,
): ModelSelection {
  const imageModels = MODEL_REGISTRY.filter((m) => m.type === "image");

  // Analyze prompt for requirements
  const requirements: { minQuality?: number; specialties?: string[] } = {};

  const needsPhotoreal =
    /photorealistic|photo|realistic|RAW|hyperdetail/i.test(prompt);
  const needsArtistic =
    /painting|artistic|illustration|anime|watercolor|ink/i.test(prompt);
  const needsHighRes =
    /8K|4K|ultra.*high.*resolution|detailed/i.test(prompt);

  if (needsPhotoreal) {
    requirements.specialties = ["photorealistic"];
    requirements.minQuality = 85;
  } else if (needsArtistic) {
    requirements.specialties = ["artistic"];
  }

  if (needsHighRes) {
    requirements.minQuality = Math.max(requirements.minQuality || 0, 85);
  }

  const best = selectBestModel(imageModels, config, requirements);

  if (!best) {
    // Fallback to first available
    const fallback = imageModels[0];
    return {
      provider: fallback.provider,
      model: fallback.model,
      reason: "fallback - no models matched criteria",
      estimatedCost: fallback.costPer1k,
      estimatedTime: fallback.estimatedTime,
    };
  }

  return {
    provider: best.provider,
    model: best.model,
    reason: buildReason(best, config),
    estimatedCost: best.costPer1k,
    estimatedTime: best.estimatedTime,
  };
}

/**
 * Select best model for video generation
 */
export function selectVideoModel(
  prompt: string,
  hasImage: boolean,
  config: RoutingConfig,
): ModelSelection {
  let videoModels = MODEL_REGISTRY.filter((m) => m.type === "video");

  // If we have a source image, filter to models that support image input
  if (hasImage) {
    const imageCompatible = videoModels.filter((m) => m.supportsImageInput);
    if (imageCompatible.length > 0) {
      videoModels = imageCompatible;
    }
  }

  // Analyze prompt for requirements
  const requirements: { minQuality?: number; specialties?: string[] } = {};

  const needsCinematic =
    /cinematic|film|movie|professional|high.*quality/i.test(prompt);
  const needsFast = /quick|fast|draft|preview/i.test(prompt);

  if (needsCinematic) {
    requirements.specialties = ["cinematic", "high-quality"];
    requirements.minQuality = 88;
  } else if (needsFast) {
    requirements.specialties = ["fast"];
  }

  if (hasImage) {
    if (!requirements.specialties) requirements.specialties = [];
    requirements.specialties.push("image-to-video");
  }

  const best = selectBestModel(videoModels, config, requirements);

  if (!best) {
    const fallback = videoModels[0];
    return {
      provider: fallback.provider,
      model: fallback.model,
      reason: "fallback - no models matched criteria",
      estimatedCost: fallback.costPer1k,
      estimatedTime: fallback.estimatedTime,
    };
  }

  return {
    provider: best.provider,
    model: best.model,
    reason: `${hasImage ? "image-to-video capable; " : ""}${buildReason(best, config)}`,
    estimatedCost: best.costPer1k,
    estimatedTime: best.estimatedTime,
  };
}

/**
 * Select best model for text generation
 */
export function selectTextModel(
  taskType: string,
  config: RoutingConfig,
): ModelSelection {
  const textModels = MODEL_REGISTRY.filter((m) => m.type === "text");
  const taskReqs = TEXT_TASK_REQUIREMENTS[taskType] || {
    minQuality: 70,
    specialties: ["general"],
  };

  const best = selectBestModel(textModels, config, taskReqs);

  if (!best) {
    const fallback = textModels[0];
    return {
      provider: fallback.provider,
      model: fallback.model,
      reason: `fallback for task type: ${taskType}`,
      estimatedCost: fallback.costPer1k,
      estimatedTime: fallback.estimatedTime,
    };
  }

  return {
    provider: best.provider,
    model: best.model,
    reason: `best for ${taskType}; ${buildReason(best, config)}`,
    estimatedCost: best.costPer1k,
    estimatedTime: best.estimatedTime,
  };
}

/**
 * Get all available models with health status
 * Checks the database for configured models and tests connectivity
 */
export async function getModelHealth(): Promise<
  Array<{
    provider: string;
    model: string;
    status: string;
    latency: number;
    errorRate: number;
  }>
> {
  const results: Array<{
    provider: string;
    model: string;
    status: string;
    latency: number;
    errorRate: number;
  }> = [];

  try {
    // Get all configured models from the database
    const configs = await u
      .db("t_config")
      .select("id", "model", "manufacturer", "apiKey", "baseUrl")
      .whereNotNull("apiKey");

    for (const config of configs) {
      // Check recent usage stats for error rate and latency
      let latency = 0;
      let errorRate = 0;
      let status = "unknown";

      try {
        // Query recent usage for this config
        const recentUsage = await u
          .db("t_modelUsage")
          .where("configId", config.id)
          .orderBy("createdAt", "desc")
          .limit(20);

        if (recentUsage.length > 0) {
          // Calculate average latency
          const totalLatency = recentUsage.reduce(
            (sum: number, r: any) => sum + (r.duration || 0),
            0,
          );
          latency = Math.round(totalLatency / recentUsage.length);

          // Calculate error rate
          const errors = recentUsage.filter(
            (r: any) => r.status === "error",
          ).length;
          errorRate =
            Math.round((errors / recentUsage.length) * 100 * 10) / 10;

          // Determine status
          if (errorRate > 50) {
            status = "degraded";
          } else if (errorRate > 20) {
            status = "warning";
          } else {
            status = "healthy";
          }
        } else {
          status = "no_data";
        }
      } catch {
        // Table might not exist, that's ok
        status = "no_data";
      }

      results.push({
        provider: config.manufacturer || "unknown",
        model: config.model || "unknown",
        status,
        latency,
        errorRate,
      });
    }
  } catch (err) {
    console.error("[ModelRouter] getModelHealth error:", err);
  }

  // Also include registry models not in DB for reference
  for (const spec of MODEL_REGISTRY) {
    const exists = results.some(
      (r) => r.provider === spec.provider && r.model === spec.model,
    );
    if (!exists) {
      results.push({
        provider: spec.provider,
        model: spec.model,
        status: "not_configured",
        latency: 0,
        errorRate: 0,
      });
    }
  }

  return results;
}
