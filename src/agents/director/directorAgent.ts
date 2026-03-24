// AI Director Agent - Core brain for rhythm, emotion, and camera language control
import u from "@/utils";

// ==================== Type Definitions ====================

export interface DirectorConfig {
  genre: string; // 韩剧/港风/仙侠/赛博
  targetDuration: number; // seconds per episode
  rhythmProfile: "fast" | "slow" | "dynamic"; // 节奏类型
  emotionCurve: "rising" | "wave" | "climax_end"; // 情绪曲线
}

export interface DirectorAnalysis {
  rhythmCurve: Array<{ timestamp: number; intensity: number }>; // 0-100
  emotionBeats: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
  }>;
  climaxPoints: number[]; // timestamps of climax moments
  suggestedCuts: Array<{
    timestamp: number;
    fromShot: string;
    toShot: string;
    transition: string;
    reason: string;
  }>;
}

export interface DirectorShotPlan {
  shots: Array<{
    index: number;
    duration: number; // seconds
    camera: string; // close_up | medium | wide | aerial | pov | over_shoulder
    movement: string; // static | push | pull | pan | tilt | dolly | crane | handheld
    emotion: string; // tension | joy | sadness | anger | calm | mystery | romance | fear | epic
    lens: string; // 24mm | 35mm | 50mm | 85mm | 135mm
    dof: string; // shallow | medium | deep
    lighting: string; // description
    composition: string; // rule_of_thirds | center | diagonal | symmetry | leading_lines
    transition: string; // cut | dissolve | fade | wipe | match_cut
    characters: string[];
    action: string;
    dialogue?: string;
    sound?: string;
    prompt: string; // fully optimized cinematic prompt
  }>;
  totalDuration: number;
  rhythmScore: number; // 0-100 how well rhythm follows the curve
  retentionScore: number; // 0-100 predicted viewer retention
}

// ==================== Genre Presets ====================

const GENRE_PRESETS: Record<
  string,
  {
    lensPreference: string[];
    lightingKeywords: string[];
    moodKeywords: string[];
    colorPalette: string;
    cameraStyle: string;
  }
> = {
  韩剧: {
    lensPreference: ["50mm", "85mm", "135mm"],
    lightingKeywords: [
      "warm amber side lighting",
      "soft window light",
      "golden hour glow",
      "gentle backlight with lens flare",
    ],
    moodKeywords: [
      "korean drama aesthetic",
      "emotional",
      "intimate",
      "romantic atmosphere",
    ],
    colorPalette: "warm tones, soft pastels, gentle color grading",
    cameraStyle: "smooth dolly, intimate close-ups, over-shoulder two-shots",
  },
  港风: {
    lensPreference: ["35mm", "50mm", "24mm"],
    lightingKeywords: [
      "neon-lit streets",
      "harsh contrast lighting",
      "moody fluorescent",
      "rain-slicked reflections",
    ],
    moodKeywords: [
      "hong kong noir aesthetic",
      "gritty urban",
      "atmospheric tension",
      "wong kar-wai style",
    ],
    colorPalette:
      "teal and orange, high contrast, saturated neons, film grain",
    cameraStyle: "handheld urgency, dutch angles, slow-motion sequences",
  },
  仙侠: {
    lensPreference: ["24mm", "35mm", "50mm"],
    lightingKeywords: [
      "ethereal mist lighting",
      "divine golden rays",
      "moonlit scene",
      "mystical aurora glow",
    ],
    moodKeywords: [
      "xianxia fantasy aesthetic",
      "mythical grandeur",
      "celestial atmosphere",
      "ancient chinese immortal realm",
    ],
    colorPalette:
      "jade greens, celestial whites, mystical purples, ink wash tones",
    cameraStyle: "sweeping crane shots, aerial vistas, slow ethereal movements",
  },
  赛博: {
    lensPreference: ["24mm", "35mm", "50mm"],
    lightingKeywords: [
      "holographic neon glow",
      "harsh cyberpunk lighting",
      "LED strip ambiance",
      "rain-diffused city lights",
    ],
    moodKeywords: [
      "cyberpunk aesthetic",
      "dystopian atmosphere",
      "high-tech low-life",
      "blade runner inspired",
    ],
    colorPalette:
      "electric blue, hot pink, toxic green, chrome reflections, deep shadows",
    cameraStyle:
      "low-angle power shots, surveillance-style framing, rapid dolly zooms",
  },
};

const DEFAULT_GENRE_PRESET = {
  lensPreference: ["35mm", "50mm", "85mm"],
  lightingKeywords: [
    "cinematic lighting",
    "three-point lighting",
    "natural ambient light",
  ],
  moodKeywords: [
    "professional cinematography",
    "cinematic atmosphere",
    "dramatic",
  ],
  colorPalette: "professional color grading, balanced tones",
  cameraStyle: "standard cinematic movements, balanced compositions",
};

// ==================== Rhythm Rules ====================

const RHYTHM_PROFILES: Record<
  string,
  { avgShotDuration: number; varianceRange: [number, number] }
> = {
  fast: { avgShotDuration: 2.0, varianceRange: [0.8, 3.5] },
  slow: { avgShotDuration: 5.0, varianceRange: [3.0, 8.0] },
  dynamic: { avgShotDuration: 3.0, varianceRange: [1.0, 6.0] },
};

const EMOTION_CAMERA_MAP: Record<
  string,
  { cameras: string[]; movements: string[]; lenses: string[]; dofs: string[] }
> = {
  tension: {
    cameras: ["close_up", "medium"],
    movements: ["push", "handheld"],
    lenses: ["50mm", "85mm"],
    dofs: ["shallow", "medium"],
  },
  joy: {
    cameras: ["medium", "wide"],
    movements: ["dolly", "crane"],
    lenses: ["35mm", "50mm"],
    dofs: ["medium", "deep"],
  },
  sadness: {
    cameras: ["close_up", "medium"],
    movements: ["static", "pull"],
    lenses: ["85mm", "135mm"],
    dofs: ["shallow"],
  },
  anger: {
    cameras: ["close_up", "medium"],
    movements: ["handheld", "push"],
    lenses: ["35mm", "50mm"],
    dofs: ["shallow", "medium"],
  },
  calm: {
    cameras: ["wide", "medium"],
    movements: ["static", "pan"],
    lenses: ["35mm", "50mm"],
    dofs: ["deep", "medium"],
  },
  mystery: {
    cameras: ["close_up", "pov"],
    movements: ["push", "tilt"],
    lenses: ["24mm", "35mm"],
    dofs: ["shallow"],
  },
  romance: {
    cameras: ["close_up", "over_shoulder"],
    movements: ["dolly", "static"],
    lenses: ["85mm", "135mm"],
    dofs: ["shallow"],
  },
  fear: {
    cameras: ["pov", "close_up"],
    movements: ["handheld", "tilt"],
    lenses: ["24mm", "35mm"],
    dofs: ["shallow", "medium"],
  },
  epic: {
    cameras: ["wide", "aerial"],
    movements: ["crane", "dolly"],
    lenses: ["24mm", "35mm"],
    dofs: ["deep"],
  },
};

// ==================== AI Prompt Templates ====================

const ANALYZE_SCRIPT_PROMPT = `你是一位顶级影视导演和节奏分析师。你的任务是深度分析剧本文本，提取出精确的节奏曲线、情绪节拍和高潮点。

## 分析要求

### 1. 节奏曲线 (rhythmCurve)
将剧本按时间轴均匀划分为 20-30 个时间点，每个点的 intensity 值 (0-100) 代表该时刻的叙事节奏强度：
- 0-20: 舒缓/铺垫/环境建立
- 21-40: 正常叙事/对话推进
- 41-60: 情节加速/小冲突
- 61-80: 紧张/大冲突/转折
- 81-100: 高潮/爆发/极致情感

### 2. 情绪节拍 (emotionBeats)
标记所有情绪变化点，每个节拍包含：
- timestamp: 归一化时间 (0-1, 0=开头, 1=结尾)
- emotion: tension/joy/sadness/anger/calm/mystery/romance/fear/epic
- intensity: 该情绪的强度 (0-100)

### 3. 高潮点 (climaxPoints)
找出 1-3 个核心高潮时刻的时间戳 (归一化 0-1)

### 4. 建议切点 (suggestedCuts)
基于专业剪辑理论，标记每个建议的镜头切换点：
- 对话转换时切（正反打）
- 情绪转折时切（氛围变化）
- 动作顶点切（动作最高点）
- 视觉对比切（跳切/交叉剪辑）

## 输出格式
返回严格的 JSON 格式：
{
  "rhythmCurve": [{"timestamp": 0.0, "intensity": 30}, ...],
  "emotionBeats": [{"timestamp": 0.0, "emotion": "calm", "intensity": 20}, ...],
  "climaxPoints": [0.65, 0.85],
  "suggestedCuts": [{"timestamp": 0.05, "fromShot": "wide", "toShot": "medium", "transition": "cut", "reason": "环境建立后推进到人物"}, ...]
}`;

const GENERATE_PLAN_PROMPT = `你是一位世界级电影导演兼分镜师。根据剧本文本和节奏分析，生成一份完整的镜头计划。

## 你的拍摄哲学
1. **开场3秒定生死** - 第一个镜头必须瞬间抓住观众
2. **每个镜头服务于情感** - 没有无意义的镜头
3. **节奏即呼吸** - 松紧交替，张弛有度
4. **视觉叙事优先** - 能用画面讲的不用台词

## 镜头计划要求

每个镜头必须包含：
- index: 序号
- duration: 时长（秒），根据节奏曲线调整
- camera: close_up / medium / wide / aerial / pov / over_shoulder
- movement: static / push / pull / pan / tilt / dolly / crane / handheld
- emotion: tension / joy / sadness / anger / calm / mystery / romance / fear / epic
- lens: 24mm / 35mm / 50mm / 85mm / 135mm
- dof: shallow / medium / deep
- lighting: 具体光线描述
- composition: rule_of_thirds / center / diagonal / symmetry / leading_lines
- transition: cut / dissolve / fade / wipe / match_cut
- characters: 出场角色名称数组
- action: 动作描述
- dialogue: 对白（可选）
- sound: 音效/音乐描述（可选）
- prompt: 完整的 AI 绘图提示词（英文，电影级质量）

## Prompt 生成规则
每个 prompt 必须包含：
1. 主体描述（人物/场景/动作）
2. 镜头语言（景别 + 焦距 + 景深）
3. 光线描述
4. 风格关键词
5. 质量保证词（masterpiece, professional cinematography, 8K）

## 节奏铁律
- 前3秒：必须有视觉冲击（特写/快切/强烈色彩）
- 高潮前：镜头加速（时长递减，切换频率升高）
- 情感戏：减速呼吸（长镜头，浅景深，静态机位）
- 每3-5秒：必须有视觉变化（景别/角度/光线）
- 结尾：留白 + 音乐情绪渐强

## 输出 JSON 格式
{
  "shots": [...],
  "totalDuration": 总时长,
  "rhythmScore": 节奏评分 0-100,
  "retentionScore": 预测留存率 0-100
}`;

// ==================== Core Functions ====================

/**
 * Analyze script text -> extract rhythm, emotion, climax points
 */
export async function analyzeScript(
  scriptText: string,
  config: DirectorConfig,
): Promise<DirectorAnalysis> {
  const genre = GENRE_PRESETS[config.genre] || DEFAULT_GENRE_PRESET;
  const promptConfig = await u.getPromptAi("outlineScriptAgent");

  const systemPrompt = `${ANALYZE_SCRIPT_PROMPT}

## 风格上下文
- 类型: ${config.genre}
- 目标时长: ${config.targetDuration}秒
- 节奏类型: ${config.rhythmProfile}
- 情绪曲线类型: ${config.emotionCurve}
- 视觉风格: ${genre.moodKeywords.join(", ")}
- 色彩基调: ${genre.colorPalette}

## 情绪曲线类型说明
- rising: 情绪持续上升，从平静到爆发
- wave: 波浪式起伏，多个小高潮
- climax_end: 前段铺垫，最后爆发`;

  try {
    const result = await u.ai.text.invoke(
      {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `请分析以下剧本的节奏和情绪结构：\n\n${scriptText}`,
          },
        ],
      },
      promptConfig,
    );

    if (result?.text) {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rhythmCurve: parsed.rhythmCurve || [],
          emotionBeats: parsed.emotionBeats || [],
          climaxPoints: parsed.climaxPoints || [],
          suggestedCuts: parsed.suggestedCuts || [],
        };
      }
    }
  } catch (err) {
    console.error("[DirectorAgent] analyzeScript AI call failed:", err);
  }

  // Fallback: rule-based analysis
  return generateFallbackAnalysis(scriptText, config);
}

/**
 * Generate shot plan from script + analysis
 */
export async function generateShotPlan(
  scriptText: string,
  analysis: DirectorAnalysis,
  config: DirectorConfig,
): Promise<DirectorShotPlan> {
  const genre = GENRE_PRESETS[config.genre] || DEFAULT_GENRE_PRESET;
  const promptConfig = await u.getPromptAi("outlineScriptAgent");

  const systemPrompt = `${GENERATE_PLAN_PROMPT}

## 风格参数
- 类型: ${config.genre}
- 目标时长: ${config.targetDuration}秒
- 节奏类型: ${config.rhythmProfile}
- 镜头偏好: ${genre.lensPreference.join(", ")}
- 光线关键词: ${genre.lightingKeywords.join(" / ")}
- 情绪关键词: ${genre.moodKeywords.join(", ")}
- 色彩基调: ${genre.colorPalette}
- 机位风格: ${genre.cameraStyle}
- Prompt 必须包含的风格词: ${genre.moodKeywords[0]}, ${genre.colorPalette}`;

  const analysisContext = `## 节奏分析结果
- 高潮点: ${analysis.climaxPoints.map((p) => `${(p * 100).toFixed(0)}%`).join(", ")}
- 情绪节拍数: ${analysis.emotionBeats.length}
- 建议切点数: ${analysis.suggestedCuts.length}
- 节奏曲线峰值: ${Math.max(...analysis.rhythmCurve.map((r) => r.intensity), 0)}

## 情绪节拍详情
${analysis.emotionBeats.map((b) => `[${(b.timestamp * 100).toFixed(0)}%] ${b.emotion} (强度: ${b.intensity})`).join("\n")}

## 建议切点
${analysis.suggestedCuts.map((c) => `[${(c.timestamp * 100).toFixed(0)}%] ${c.fromShot} -> ${c.toShot} (${c.transition}) - ${c.reason}`).join("\n")}`;

  try {
    const result = await u.ai.text.invoke(
      {
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${analysisContext}\n\n## 原始剧本\n${scriptText}\n\n请生成完整的镜头计划（JSON格式），目标总时长约 ${config.targetDuration} 秒。`,
          },
        ],
      },
      promptConfig,
    );

    if (result?.text) {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const plan: DirectorShotPlan = {
          shots: (parsed.shots || []).map((s: any, i: number) => ({
            index: s.index ?? i + 1,
            duration: s.duration ?? 3,
            camera: s.camera || "medium",
            movement: s.movement || "static",
            emotion: s.emotion || "calm",
            lens: s.lens || "50mm",
            dof: s.dof || "medium",
            lighting: s.lighting || "cinematic lighting",
            composition: s.composition || "rule_of_thirds",
            transition: s.transition || "cut",
            characters: s.characters || [],
            action: s.action || "",
            dialogue: s.dialogue,
            sound: s.sound,
            prompt: s.prompt || "",
          })),
          totalDuration: parsed.totalDuration || 0,
          rhythmScore: parsed.rhythmScore || 0,
          retentionScore: parsed.retentionScore || 0,
        };

        // Auto-calculate totalDuration if AI didn't
        if (!plan.totalDuration) {
          plan.totalDuration = plan.shots.reduce(
            (sum, s) => sum + s.duration,
            0,
          );
        }

        return applyRhythmRules(plan, config);
      }
    }
  } catch (err) {
    console.error("[DirectorAgent] generateShotPlan AI call failed:", err);
  }

  // Fallback: generate basic plan from analysis
  return generateFallbackPlan(analysis, config);
}

/**
 * Auto-adjust rhythm based on professional directing rules
 */
export function applyRhythmRules(
  plan: DirectorShotPlan,
  config: DirectorConfig,
): DirectorShotPlan {
  const shots = [...plan.shots];
  const profile = RHYTHM_PROFILES[config.rhythmProfile] || RHYTHM_PROFILES.dynamic;
  const totalShots = shots.length;

  if (totalShots === 0) return plan;

  // Rule 1: First 3 seconds MUST hook (fast cuts, high intensity)
  let accumulatedTime = 0;
  for (let i = 0; i < shots.length && accumulatedTime < 3; i++) {
    // Shorten opening shots for impact
    if (shots[i].duration > 2.0) {
      shots[i].duration = Math.max(1.0, shots[i].duration * 0.6);
    }
    // Prefer dynamic cameras in opening
    if (shots[i].movement === "static" && i === 0) {
      shots[i].movement = "push";
    }
    // Ensure strong composition for opening
    if (i === 0) {
      shots[i].composition = "center";
    }
    accumulatedTime += shots[i].duration;
  }

  // Rule 2: Before climax - accelerate (shorter shots)
  // Find which shots correspond to the last 30% of the plan
  const totalDuration = shots.reduce((s, sh) => s + sh.duration, 0);
  const climaxThreshold = totalDuration * 0.7;
  let runningTime = 0;

  for (let i = 0; i < shots.length; i++) {
    runningTime += shots[i].duration;
    const progress = runningTime / totalDuration;

    // Pre-climax acceleration (70%-90% of timeline)
    if (progress > 0.7 && progress < 0.9) {
      shots[i].duration = Math.max(
        profile.varianceRange[0],
        shots[i].duration * 0.75,
      );
      // Prefer faster transitions before climax
      if (shots[i].transition === "dissolve" || shots[i].transition === "fade") {
        shots[i].transition = "cut";
      }
    }

    // Rule 3: Emotion scenes - decelerate (longer shots, close-ups)
    if (
      shots[i].emotion === "sadness" ||
      shots[i].emotion === "romance" ||
      shots[i].emotion === "calm"
    ) {
      shots[i].duration = Math.max(
        shots[i].duration,
        profile.avgShotDuration * 1.2,
      );
      // Emotional shots benefit from shallow DOF
      shots[i].dof = "shallow";
      // Prefer close-ups for emotional beats
      const emotionMapping = EMOTION_CAMERA_MAP[shots[i].emotion];
      if (emotionMapping && !emotionMapping.cameras.includes(shots[i].camera)) {
        shots[i].camera = emotionMapping.cameras[0];
      }
    }
  }

  // Rule 4: Every 3-5s must have visual change
  runningTime = 0;
  let lastChangeTime = 0;
  for (let i = 1; i < shots.length; i++) {
    runningTime += shots[i - 1].duration;
    const timeSinceChange = runningTime - lastChangeTime;

    // If no visual change in 5+ seconds, force one
    if (timeSinceChange >= 5 && shots[i].camera === shots[i - 1].camera) {
      const alternatives = ["close_up", "medium", "wide", "over_shoulder"];
      const different = alternatives.filter((a) => a !== shots[i].camera);
      shots[i].camera = different[Math.floor(Math.random() * different.length)];
      lastChangeTime = runningTime;
    } else if (
      shots[i].camera !== shots[i - 1].camera ||
      shots[i].movement !== shots[i - 1].movement
    ) {
      lastChangeTime = runningTime;
    }
  }

  // Rule 5: Ending must be memorable (slow + music swell)
  if (shots.length >= 2) {
    const lastShot = shots[shots.length - 1];
    const secondLast = shots[shots.length - 2];

    // Slow down ending
    lastShot.duration = Math.max(lastShot.duration, profile.avgShotDuration * 1.5);
    secondLast.duration = Math.max(secondLast.duration, profile.avgShotDuration * 1.2);

    // Ending transitions should be gentle
    lastShot.transition = "fade";
    secondLast.transition = "dissolve";

    // Add music swell note if not present
    if (!lastShot.sound) {
      lastShot.sound = "emotional music crescendo, lingering resonance";
    }
  }

  // Recalculate total duration
  const newTotalDuration = shots.reduce((s, sh) => s + sh.duration, 0);

  // Calculate rhythm score based on variety and pacing
  const rhythmScore = calculateRhythmScore(shots, config);

  return {
    shots,
    totalDuration: Math.round(newTotalDuration * 100) / 100,
    rhythmScore,
    retentionScore: plan.retentionScore,
  };
}

/**
 * Score a shot plan for viral potential
 */
export function scoreViralPotential(plan: DirectorShotPlan): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 50; // Start at baseline

  if (plan.shots.length === 0) {
    return { score: 0, issues: ["No shots in plan"], suggestions: ["Generate a shot plan first"] };
  }

  // Check 1: Hook Strength (0-25 points)
  const firstThreeSeconds: typeof plan.shots = [];
  let hookTime = 0;
  for (const shot of plan.shots) {
    if (hookTime >= 3) break;
    firstThreeSeconds.push(shot);
    hookTime += shot.duration;
  }

  if (firstThreeSeconds.length === 0) {
    issues.push("Opening hook is missing");
    score -= 15;
  } else {
    const hookHasCloseUp = firstThreeSeconds.some(
      (s) => s.camera === "close_up" || s.camera === "pov",
    );
    const hookHasMovement = firstThreeSeconds.some(
      (s) => s.movement !== "static",
    );
    const hookHasEmotion = firstThreeSeconds.some(
      (s) =>
        s.emotion === "tension" ||
        s.emotion === "mystery" ||
        s.emotion === "epic",
    );

    if (hookHasCloseUp) score += 8;
    else suggestions.push("Consider a close-up or POV shot in the first 3 seconds for stronger hook");

    if (hookHasMovement) score += 8;
    else suggestions.push("Add camera movement in the opening for dynamic energy");

    if (hookHasEmotion) score += 9;
    else issues.push("Opening lacks strong emotional hook - consider tension/mystery/epic");
  }

  // Check 2: Pacing Variety (0-25 points)
  const durations = plan.shots.map((s) => s.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const durationVariance =
    durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
    durations.length;
  const stdDev = Math.sqrt(durationVariance);

  if (stdDev > 0.5) {
    score += 10; // Good variety
  } else {
    issues.push("Shot durations are too uniform - rhythm feels monotonous");
    score -= 5;
  }

  // Check camera variety
  const uniqueCameras = new Set(plan.shots.map((s) => s.camera));
  if (uniqueCameras.size >= 4) {
    score += 8;
  } else if (uniqueCameras.size >= 3) {
    score += 4;
  } else {
    issues.push(
      `Only ${uniqueCameras.size} camera types used - needs more visual variety`,
    );
  }

  // Check transition variety
  const uniqueTransitions = new Set(plan.shots.map((s) => s.transition));
  if (uniqueTransitions.size >= 3) {
    score += 7;
  } else {
    suggestions.push(
      "Use more transition types (dissolve, match_cut) for visual interest",
    );
  }

  // Check 3: Emotion Peaks (0-25 points)
  const emotionIntensities = plan.shots.map((s) => {
    const highEmotions = ["tension", "epic", "anger", "fear"];
    return highEmotions.includes(s.emotion) ? 80 : 40;
  });

  const hasEmotionPeak = emotionIntensities.some((i) => i >= 80);
  if (hasEmotionPeak) {
    score += 10;
  } else {
    issues.push("No high-intensity emotional peaks found");
  }

  // Check for emotional variety
  const uniqueEmotions = new Set(plan.shots.map((s) => s.emotion));
  if (uniqueEmotions.size >= 4) {
    score += 8;
  } else if (uniqueEmotions.size >= 3) {
    score += 4;
  } else {
    suggestions.push(
      "Add more emotional variety - viewers need contrast to stay engaged",
    );
  }

  // Check emotion builds toward climax
  const lastQuarterStart = Math.floor(plan.shots.length * 0.75);
  const lastQuarterEmotions = plan.shots
    .slice(lastQuarterStart)
    .map((s) => s.emotion);
  const hasLateClimax = lastQuarterEmotions.some(
    (e) => e === "tension" || e === "epic" || e === "anger",
  );
  if (hasLateClimax) {
    score += 7;
  } else {
    suggestions.push(
      "Build emotional intensity in the final quarter for a stronger climax",
    );
  }

  // Check 4: Ending Memorability (0-25 points)
  if (plan.shots.length >= 2) {
    const lastShot = plan.shots[plan.shots.length - 1];
    const secondLast = plan.shots[plan.shots.length - 2];

    // Slow ending
    if (lastShot.duration >= 3.5) {
      score += 8;
    } else {
      suggestions.push("Slow down the final shot for emotional resonance");
    }

    // Gentle transition at end
    if (
      lastShot.transition === "fade" ||
      lastShot.transition === "dissolve"
    ) {
      score += 5;
    }

    // Sound design at ending
    if (lastShot.sound) {
      score += 5;
    } else {
      suggestions.push("Add music/sound design to the ending for memorability");
    }

    // Ending emotion
    if (
      lastShot.emotion === "epic" ||
      lastShot.emotion === "sadness" ||
      lastShot.emotion === "romance"
    ) {
      score += 7;
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, issues, suggestions };
}

// ==================== Helper Functions ====================

function calculateRhythmScore(
  shots: DirectorShotPlan["shots"],
  config: DirectorConfig,
): number {
  let score = 50;
  const profile = RHYTHM_PROFILES[config.rhythmProfile] || RHYTHM_PROFILES.dynamic;

  // Score based on duration variety matching the profile
  for (const shot of shots) {
    if (
      shot.duration >= profile.varianceRange[0] &&
      shot.duration <= profile.varianceRange[1]
    ) {
      score += 2;
    } else {
      score -= 1;
    }
  }

  // Score based on camera-emotion coherence
  for (const shot of shots) {
    const mapping = EMOTION_CAMERA_MAP[shot.emotion];
    if (mapping) {
      if (mapping.cameras.includes(shot.camera)) score += 1;
      if (mapping.movements.includes(shot.movement)) score += 1;
      if (mapping.lenses.includes(shot.lens)) score += 1;
    }
  }

  // Score consecutive shot variety
  for (let i = 1; i < shots.length; i++) {
    if (shots[i].camera !== shots[i - 1].camera) score += 1;
    if (shots[i].camera === shots[i - 1].camera && shots[i].movement === shots[i - 1].movement) {
      score -= 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function generateFallbackAnalysis(
  scriptText: string,
  config: DirectorConfig,
): DirectorAnalysis {
  // Rule-based fallback when AI is unavailable
  const sentences = scriptText.split(/[。！？\n]+/).filter((s) => s.trim());
  const totalSentences = sentences.length || 1;

  // Generate rhythm curve based on text density and punctuation
  const rhythmCurve: DirectorAnalysis["rhythmCurve"] = [];
  const points = 20;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    let intensity: number;

    switch (config.emotionCurve) {
      case "rising":
        intensity = 20 + progress * 70;
        break;
      case "wave":
        intensity = 50 + 30 * Math.sin(progress * Math.PI * 3);
        break;
      case "climax_end":
        intensity =
          progress < 0.7 ? 30 + progress * 30 : 30 + (progress - 0.3) * 100;
        break;
      default:
        intensity = 50;
    }

    // Add noise
    intensity += (Math.random() - 0.5) * 15;
    intensity = Math.max(0, Math.min(100, Math.round(intensity)));

    rhythmCurve.push({ timestamp: Math.round(progress * 100) / 100, intensity });
  }

  // Extract emotion beats from text analysis
  const emotionBeats: DirectorAnalysis["emotionBeats"] = [];
  const emotionKeywords: Record<string, string[]> = {
    tension: ["紧张", "恐惧", "危险", "逼近", "威胁", "颤抖"],
    joy: ["笑", "开心", "高兴", "欢", "幸福", "甜蜜"],
    sadness: ["哭", "泪", "悲", "伤心", "痛", "离别"],
    anger: ["怒", "愤", "吼", "摔", "咬牙", "爆发"],
    mystery: ["秘密", "隐藏", "神秘", "暗", "发现", "真相"],
    romance: ["爱", "心动", "拥抱", "吻", "温柔", "深情"],
    fear: ["恐", "怕", "惊", "吓", "逃", "尖叫"],
  };

  sentences.forEach((sentence, idx) => {
    const progress = idx / totalSentences;
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some((kw) => sentence.includes(kw))) {
        emotionBeats.push({
          timestamp: Math.round(progress * 100) / 100,
          emotion,
          intensity: 60 + Math.random() * 30,
        });
        break;
      }
    }
  });

  // If no emotions detected, add generic beats
  if (emotionBeats.length === 0) {
    emotionBeats.push(
      { timestamp: 0, emotion: "calm", intensity: 30 },
      { timestamp: 0.5, emotion: "tension", intensity: 65 },
      { timestamp: 0.8, emotion: "epic", intensity: 85 },
    );
  }

  // Climax points
  const climaxPoints =
    config.emotionCurve === "climax_end"
      ? [0.85]
      : config.emotionCurve === "wave"
        ? [0.33, 0.66, 0.9]
        : [0.75];

  // Suggested cuts every ~3 seconds
  const suggestedCuts: DirectorAnalysis["suggestedCuts"] = [];
  const shotInterval = 3 / config.targetDuration;
  const cameras = ["wide", "medium", "close_up", "over_shoulder"];
  for (
    let t = shotInterval;
    t < 1;
    t += shotInterval + (Math.random() - 0.5) * shotInterval * 0.4
  ) {
    const fromIdx = Math.floor(Math.random() * cameras.length);
    let toIdx = (fromIdx + 1 + Math.floor(Math.random() * (cameras.length - 1))) % cameras.length;
    suggestedCuts.push({
      timestamp: Math.round(t * 100) / 100,
      fromShot: cameras[fromIdx],
      toShot: cameras[toIdx],
      transition: Math.random() > 0.7 ? "dissolve" : "cut",
      reason: "节奏变化切换",
    });
  }

  return { rhythmCurve, emotionBeats, climaxPoints, suggestedCuts };
}

function generateFallbackPlan(
  analysis: DirectorAnalysis,
  config: DirectorConfig,
): DirectorShotPlan {
  const profile = RHYTHM_PROFILES[config.rhythmProfile] || RHYTHM_PROFILES.dynamic;
  const genre = GENRE_PRESETS[config.genre] || DEFAULT_GENRE_PRESET;
  const numShots = Math.max(
    5,
    Math.round(config.targetDuration / profile.avgShotDuration),
  );

  const shots: DirectorShotPlan["shots"] = [];

  for (let i = 0; i < numShots; i++) {
    const progress = i / (numShots - 1);

    // Find nearest emotion beat
    const nearestBeat = analysis.emotionBeats.reduce(
      (nearest, beat) =>
        Math.abs(beat.timestamp - progress) <
        Math.abs(nearest.timestamp - progress)
          ? beat
          : nearest,
      analysis.emotionBeats[0] || {
        timestamp: 0,
        emotion: "calm",
        intensity: 40,
      },
    );

    const emotion = nearestBeat.emotion as keyof typeof EMOTION_CAMERA_MAP;
    const mapping = EMOTION_CAMERA_MAP[emotion] || EMOTION_CAMERA_MAP.calm;

    // Calculate duration based on rhythm curve
    const rhythmPoint = analysis.rhythmCurve.reduce(
      (nearest, point) =>
        Math.abs(point.timestamp - progress) <
        Math.abs(nearest.timestamp - progress)
          ? point
          : nearest,
      analysis.rhythmCurve[0] || { timestamp: 0, intensity: 50 },
    );

    // Higher intensity = shorter shots
    const intensityFactor = 1 - rhythmPoint.intensity / 150;
    const duration =
      Math.round(
        (profile.avgShotDuration * intensityFactor +
          profile.varianceRange[0]) *
          10,
      ) / 10;

    const lens =
      mapping.lenses[Math.floor(Math.random() * mapping.lenses.length)];
    const camera =
      mapping.cameras[Math.floor(Math.random() * mapping.cameras.length)];

    shots.push({
      index: i + 1,
      duration: Math.max(profile.varianceRange[0], duration),
      camera,
      movement:
        mapping.movements[
          Math.floor(Math.random() * mapping.movements.length)
        ],
      emotion: nearestBeat.emotion,
      lens,
      dof: mapping.dofs[Math.floor(Math.random() * mapping.dofs.length)],
      lighting:
        genre.lightingKeywords[
          Math.floor(Math.random() * genre.lightingKeywords.length)
        ],
      composition:
        i === 0
          ? "center"
          : ["rule_of_thirds", "diagonal", "symmetry", "leading_lines"][
              Math.floor(Math.random() * 4)
            ],
      transition: i === numShots - 1 ? "fade" : "cut",
      characters: [],
      action: `Shot ${i + 1} action`,
      prompt: `cinematic ${camera} shot, ${lens} lens, ${genre.moodKeywords[0]}, ${genre.lightingKeywords[0]}, ${genre.colorPalette}, professional cinematography, masterpiece, 8K`,
    });
  }

  const plan: DirectorShotPlan = {
    shots,
    totalDuration: shots.reduce((s, sh) => s + sh.duration, 0),
    rhythmScore: 0,
    retentionScore: 0,
  };

  return applyRhythmRules(plan, config);
}
