// Prompt Optimization Agent - Transforms simple descriptions into cinema-grade prompts
import u from "@/utils";

// ==================== Type Definitions ====================

export interface PromptOptimizeConfig {
  style: string; // art style name
  genre: string; // drama genre
  globalLighting: string;
  globalMood: string;
}

// ==================== Style Dictionaries ====================

const STYLE_TOKENS: Record<string, string> = {
  写实: "photorealistic, hyperdetailed, 8K UHD, RAW photo, professional photography",
  动漫: "anime style, vibrant colors, detailed illustration, studio quality anime",
  水墨: "chinese ink painting style, sumi-e aesthetic, elegant brushstrokes, traditional art",
  赛博朋克: "cyberpunk style, neon-lit, holographic, futuristic dystopian aesthetic",
  油画: "oil painting style, rich impasto texture, classical fine art, museum quality",
  漫画: "comic book style, bold linework, dynamic composition, graphic novel aesthetic",
  水彩: "watercolor painting style, soft translucent washes, delicate artistic aesthetic",
  像素: "pixel art style, retro game aesthetic, clean pixel work, nostalgic",
};

const GENRE_TOKENS: Record<string, string> = {
  韩剧: "korean drama aesthetic, emotional warmth, soft romantic atmosphere, K-drama cinematography",
  港风: "hong kong cinema aesthetic, Wong Kar-wai inspired, urban noir atmosphere, nostalgic film grain",
  仙侠: "xianxia fantasy aesthetic, celestial grandeur, mystical ancient chinese realm, ethereal atmosphere",
  赛博: "cyberpunk aesthetic, neon-drenched dystopia, high-tech low-life, Blade Runner inspired",
  悬疑: "thriller aesthetic, dark moody atmosphere, psychological tension, suspenseful lighting",
  喜剧: "bright vibrant aesthetic, warm cheerful lighting, lively atmosphere, comedic energy",
  古装: "historical chinese costume drama aesthetic, ornate period details, palace grandeur",
  都市: "modern urban aesthetic, contemporary city life, stylish cinematography, metropolitan atmosphere",
};

const QUALITY_TOKENS = "masterpiece, best quality, professional cinematography, cinematic composition, volumetric lighting, 8K resolution";

const NEGATIVE_CONCEPTS = "blurry, low quality, distorted, deformed, ugly, amateur, oversaturated, underexposed";

// ==================== Camera Language Dictionary ====================

const CAMERA_DESCRIPTIONS: Record<string, string> = {
  close_up: "cinematic close-up shot, intimate framing",
  medium: "medium shot, balanced composition",
  wide: "wide establishing shot, expansive framing",
  aerial: "aerial view, bird's eye perspective, sweeping vista",
  pov: "first-person POV shot, immersive perspective",
  over_shoulder: "over-the-shoulder shot, conversational framing",
};

const LENS_DESCRIPTIONS: Record<string, string> = {
  "24mm": "24mm wide-angle lens, dramatic perspective distortion",
  "35mm": "35mm lens, natural field of view",
  "50mm": "50mm lens, human eye perspective, natural rendering",
  "85mm": "85mm portrait lens, beautiful subject separation",
  "135mm": "135mm telephoto lens, compressed background, dreamy bokeh",
};

const DOF_DESCRIPTIONS: Record<string, string> = {
  shallow: "shallow depth of field f/1.4, beautiful bokeh, sharp subject isolation",
  medium: "medium depth of field f/4, balanced focus",
  deep: "deep depth of field f/11, everything in sharp focus",
};

// ==================== Core Prompt Build System ====================

const OPTIMIZER_SYSTEM_PROMPT = `你是一位世界顶级的 AI 绘图提示词工程师，专精将简单中文描述转化为电影级英文提示词。

## 你的转化原则

### 1. 主体强化
- 将模糊描述转为具体视觉语言
- "女生" → "beautiful young woman with delicate features"
- "回头" → "turning her head gracefully, looking over her shoulder"
- 添加表情、姿态、服装细节

### 2. 镜头语言
- 永远包含景别和焦距
- 描述景深效果
- 注明构图方式

### 3. 光线氛围
- 具体描述光源方向和类型
- 包含色温和氛围词
- 光影对比度

### 4. 风格一致性
- 保持全局风格词不变
- 每个 prompt 都包含统一的质量标签
- 色彩调性保持一致

### 5. CHARACTER LOCK 处理
如果提供了 CHARACTER LOCK 块，必须将其完整嵌入 prompt 开头，确保角色一致性。
格式: [CHARACTER: <lock description>]

## 输出要求
- 纯英文
- 不要使用引号包裹
- 不要添加解释
- 直接输出优化后的 prompt
- 长度控制在 50-150 个英文单词`;

// ==================== Core Functions ====================

/**
 * Transform a simple description into a cinema-grade prompt
 */
export async function optimizePrompt(
  simpleDescription: string,
  config: PromptOptimizeConfig,
  characterLocks?: string[],
): Promise<string> {
  const promptConfig = await u.getPromptAi("outlineScriptAgent");

  // Build context tokens
  const styleToken = STYLE_TOKENS[config.style] || config.style;
  const genreToken = GENRE_TOKENS[config.genre] || config.genre;
  const lightingToken = config.globalLighting || "cinematic lighting";
  const moodToken = config.globalMood || "dramatic atmosphere";

  // Build character lock prefix
  const lockPrefix = characterLocks?.length
    ? characterLocks.map((lock) => `[CHARACTER LOCK: ${lock}]`).join("\n") + "\n\n"
    : "";

  const contextInfo = `## 全局风格参数
- 画风: ${styleToken}
- 类型: ${genreToken}
- 全局光线: ${lightingToken}
- 全局情绪: ${moodToken}
- 质量标签: ${QUALITY_TOKENS}
${characterLocks?.length ? `\n## CHARACTER LOCK 块（必须嵌入 prompt 开头）\n${characterLocks.join("\n")}` : ""}`;

  // Attempt AI optimization
  if (promptConfig && "apiKey" in promptConfig) {
    try {
      const result = await u.ai.text.invoke(
        {
          messages: [
            { role: "system", content: `${OPTIMIZER_SYSTEM_PROMPT}\n\n${contextInfo}` },
            {
              role: "user",
              content: `请将以下简单描述转化为电影级 AI 绘图提示词：\n\n${simpleDescription}`,
            },
          ],
        },
        promptConfig,
      );

      if (result?.text) {
        const optimized = result.text.trim().replace(/^["']|["']$/g, "");
        // Ensure quality tokens are present
        if (!optimized.toLowerCase().includes("masterpiece")) {
          return `${lockPrefix}${optimized}, ${QUALITY_TOKENS}`;
        }
        return `${lockPrefix}${optimized}`;
      }
    } catch (err) {
      console.error("[PromptOptimizer] AI optimization failed:", err);
    }
  }

  // Fallback: rule-based prompt construction
  return buildPromptRuleBased(simpleDescription, config, characterLocks);
}

/**
 * Batch optimize multiple prompts with consistent style
 */
export async function batchOptimize(
  prompts: string[],
  config: PromptOptimizeConfig,
): Promise<string[]> {
  const promptConfig = await u.getPromptAi("outlineScriptAgent");

  // Build shared style context
  const styleToken = STYLE_TOKENS[config.style] || config.style;
  const genreToken = GENRE_TOKENS[config.genre] || config.genre;
  const lightingToken = config.globalLighting || "cinematic lighting";
  const moodToken = config.globalMood || "dramatic atmosphere";

  const sharedStyleSuffix = [
    styleToken,
    genreToken,
    lightingToken,
    moodToken,
    QUALITY_TOKENS,
  ]
    .filter(Boolean)
    .join(", ");

  // If AI is available, batch via single call for consistency
  if (promptConfig && "apiKey" in promptConfig) {
    try {
      const numberedPrompts = prompts
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n");

      const result = await u.ai.text.invoke(
        {
          messages: [
            {
              role: "system",
              content: `${OPTIMIZER_SYSTEM_PROMPT}

## 批量优化模式
你将一次性优化多个描述。所有输出必须共享完全一致的风格/光线/质量关键词。
用数字编号输出每个优化结果，每行一个。格式:
1. optimized prompt here
2. optimized prompt here

## 全局风格参数
- 画风: ${styleToken}
- 类型: ${genreToken}
- 全局光线: ${lightingToken}
- 全局情绪: ${moodToken}
- 质量标签: ${QUALITY_TOKENS}

## 一致性要求
- 所有 prompt 使用相同的色彩词
- 所有 prompt 使用相同的风格词
- 所有 prompt 使用相同的质量词
- 光线描述保持统一基调`,
            },
            {
              role: "user",
              content: `请批量优化以下 ${prompts.length} 个描述：\n\n${numberedPrompts}`,
            },
          ],
        },
        promptConfig,
      );

      if (result?.text) {
        // Parse numbered results
        const lines = result.text.split("\n").filter((l) => l.trim());
        const optimized: string[] = [];

        for (const line of lines) {
          const match = line.match(/^\d+[\.\)]\s*(.+)/);
          if (match) {
            let prompt = match[1].trim().replace(/^["']|["']$/g, "");
            if (!prompt.toLowerCase().includes("masterpiece")) {
              prompt += `, ${QUALITY_TOKENS}`;
            }
            optimized.push(prompt);
          }
        }

        // If we got the right number of results, return them
        if (optimized.length === prompts.length) {
          return optimized;
        }

        // If partial results, fill in with rule-based for missing ones
        if (optimized.length > 0) {
          const results: string[] = [];
          for (let i = 0; i < prompts.length; i++) {
            if (i < optimized.length) {
              results.push(optimized[i]);
            } else {
              results.push(
                buildPromptRuleBased(prompts[i], config),
              );
            }
          }
          return results;
        }
      }
    } catch (err) {
      console.error("[PromptOptimizer] Batch AI optimization failed:", err);
    }
  }

  // Fallback: rule-based batch optimization with shared suffix
  return prompts.map((p) => buildPromptRuleBased(p, config));
}

// ==================== Rule-Based Fallback ====================

function buildPromptRuleBased(
  description: string,
  config: PromptOptimizeConfig,
  characterLocks?: string[],
): string {
  const parts: string[] = [];

  // Character lock prefix
  if (characterLocks?.length) {
    parts.push(
      ...characterLocks.map((lock) => `[CHARACTER: ${lock}]`),
    );
  }

  // Translate common Chinese descriptions to cinematic English
  let mainSubject = translateToEnglish(description);
  parts.push(mainSubject);

  // Add camera language (default to medium shot if not specified)
  if (!mainSubject.toLowerCase().includes("shot")) {
    parts.push("cinematic medium shot, 50mm lens");
  }

  // Add DOF
  parts.push("shallow depth of field f/2.0, soft bokeh background");

  // Add style tokens
  const styleToken = STYLE_TOKENS[config.style];
  if (styleToken) {
    parts.push(styleToken);
  } else if (config.style) {
    parts.push(`${config.style} art style`);
  }

  // Add genre tokens
  const genreToken = GENRE_TOKENS[config.genre];
  if (genreToken) {
    parts.push(genreToken);
  }

  // Add lighting
  parts.push(config.globalLighting || "cinematic three-point lighting");

  // Add mood
  parts.push(config.globalMood || "dramatic atmosphere");

  // Add quality tokens
  parts.push(QUALITY_TOKENS);

  return parts.join(", ");
}

/**
 * Basic Chinese-to-English visual description translation
 */
function translateToEnglish(chinese: string): string {
  const translations: Record<string, string> = {
    女生: "beautiful young woman",
    女孩: "beautiful young girl",
    男生: "handsome young man",
    男孩: "handsome young boy",
    男人: "man",
    女人: "woman",
    老人: "elderly person",
    小孩: "child",
    回头: "turning her head gracefully, looking over her shoulder",
    微笑: "gentle smile, warm expression",
    哭泣: "tears streaming down face, emotional crying",
    奔跑: "running dynamically, motion blur",
    站立: "standing elegantly, confident posture",
    坐着: "sitting gracefully",
    走路: "walking with purpose",
    拥抱: "embracing warmly, intimate hug",
    亲吻: "kissing tenderly, romantic moment",
    打斗: "dynamic combat, martial arts action",
    飞行: "soaring through the sky, flying gracefully",
    城市: "modern cityscape, urban landscape",
    森林: "lush forest, dense foliage",
    海边: "seaside, ocean waves, beach",
    山顶: "mountain peak, majestic summit",
    雨天: "rainy day, rain drops, wet reflections",
    夜晚: "nighttime scene, moonlit",
    日落: "golden sunset, warm twilight",
    下雪: "snowfall, winter wonderland",
    宫殿: "grand palace, ornate architecture",
    街道: "atmospheric street, urban corridor",
    教室: "classroom interior, academic setting",
    医院: "hospital interior, clinical lighting",
    愤怒: "angry expression, intense gaze",
    惊讶: "surprised expression, wide eyes",
    害怕: "fearful expression, terrified look",
    思考: "contemplative expression, deep in thought",
    孤独: "solitary figure, isolated atmosphere",
    特写: "extreme close-up shot",
    远景: "wide establishing shot, vast landscape",
    俯拍: "high angle shot, bird's eye view",
    仰拍: "low angle shot, dramatic perspective",
  };

  let result = chinese;
  // Apply all known translations
  for (const [cn, en] of Object.entries(translations)) {
    if (result.includes(cn)) {
      result = result.replace(new RegExp(cn, "g"), en);
    }
  }

  // If the result is still mostly Chinese, wrap it as a description
  const chineseCharRegex = /[\u4e00-\u9fff]/;
  if (chineseCharRegex.test(result)) {
    // Still has Chinese chars - wrap with generic cinematic framing
    return `cinematic scene depicting: ${result}`;
  }

  return result;
}
