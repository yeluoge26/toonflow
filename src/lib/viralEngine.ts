import u from "@/utils";

// ============================================================
// Viral Structure Engine (爆款结构引擎)
// Core insight: viral short videos share a 3-part structure:
//   HOOK (前3秒) → MID (情绪递进) → ENDING (记忆点/反转)
// ============================================================

export interface ViralStructure {
  hook: {
    type: "question" | "conflict" | "mystery" | "shock" | "empathy";
    text: string;
    durationMs: number;     // 2000-4000
    shotType: string;       // "extreme_close_up" etc.
    emotion: string;
    technique: string;      // "start mid-action, no context"
  };
  mid: {
    type: "escalation" | "revelation" | "emotional_peak" | "tension_build";
    beats: Array<{
      text: string;
      durationMs: number;
      emotion: string;
      intensity: number;    // 1-10
    }>;
  };
  ending: {
    type: "twist" | "callback" | "cliffhanger" | "emotional_release" | "punchline";
    text: string;
    durationMs: number;
    shotType: string;
    emotion: string;
  };
  totalDurationMs: number;
  retentionScore: number;   // predicted 0-100
}

// ============================================================
// 8 Pre-built viral templates with full HOOK/MID/ENDING data
// ============================================================
export const VIRAL_TEMPLATES: Record<string, ViralStructure> = {
  emotion_bar: {
    hook: {
      type: "mystery",
      text: "我不太会喝酒",
      durationMs: 3000,
      shotType: "extreme_close_up",
      emotion: "mysterious",
      technique: "start mid-action, no context",
    },
    mid: {
      type: "emotional_peak",
      beats: [
        { text: "调酒师沉默地调了一杯特别的酒", durationMs: 4000, emotion: "curiosity", intensity: 3 },
        { text: "她接过酒，闻了一下，眼眶突然红了", durationMs: 3000, emotion: "nostalgia", intensity: 6 },
        { text: "「这是我妈妈以前最爱的味道」", durationMs: 3000, emotion: "sadness", intensity: 8 },
        { text: "调酒师轻声说：「我知道，她托我照顾你」", durationMs: 4000, emotion: "shock", intensity: 10 },
      ],
    },
    ending: {
      type: "emotional_release",
      text: "一杯就够了",
      durationMs: 3000,
      shotType: "wide_shot",
      emotion: "bittersweet",
    },
    totalDurationMs: 20000,
    retentionScore: 88,
  },

  breakup_moment: {
    hook: {
      type: "conflict",
      text: "分手那天，他笑着说没关系",
      durationMs: 3000,
      shotType: "close_up",
      emotion: "calm_facade",
      technique: "emotional contrast - smile masking pain",
    },
    mid: {
      type: "revelation",
      beats: [
        { text: "他回到家，打开冰箱，里面还有她昨天买的草莓", durationMs: 3500, emotion: "loneliness", intensity: 4 },
        { text: "手机里最后一条消息还是「到家了吗」", durationMs: 3000, emotion: "regret", intensity: 6 },
        { text: "他想删掉聊天记录，手指悬在屏幕上方", durationMs: 3000, emotion: "hesitation", intensity: 8 },
        { text: "最终，他把手机翻过来，扣在桌上", durationMs: 2500, emotion: "heartbreak", intensity: 9 },
      ],
    },
    ending: {
      type: "callback",
      text: "草莓坏掉的那天，他才真的哭了",
      durationMs: 3000,
      shotType: "extreme_close_up",
      emotion: "devastation",
    },
    totalDurationMs: 18000,
    retentionScore: 92,
  },

  healing_journey: {
    hook: {
      type: "empathy",
      text: "你有没有一个地方，去了就会安静下来",
      durationMs: 3500,
      shotType: "wide_shot",
      emotion: "melancholy",
      technique: "direct address to viewer, second person",
    },
    mid: {
      type: "escalation",
      beats: [
        { text: "她辞了职，一个人来到海边的小镇", durationMs: 3500, emotion: "emptiness", intensity: 3 },
        { text: "每天只做三件事：看海、吃饭、发呆", durationMs: 3000, emotion: "peace", intensity: 4 },
        { text: "第七天，她在沙滩上遇到一只受伤的小狗", durationMs: 3000, emotion: "tenderness", intensity: 6 },
        { text: "她第一次笑了，是真的笑了", durationMs: 2500, emotion: "warmth", intensity: 8 },
      ],
    },
    ending: {
      type: "emotional_release",
      text: "治愈你的不是时间，是你终于愿意放过自己",
      durationMs: 3500,
      shotType: "medium_shot",
      emotion: "relief",
    },
    totalDurationMs: 19000,
    retentionScore: 85,
  },

  revenge_calm: {
    hook: {
      type: "shock",
      text: "被开除那天，她没有哭，只是笑了一下",
      durationMs: 3000,
      shotType: "close_up",
      emotion: "cold_calm",
      technique: "unexpected reaction, subverting expectations",
    },
    mid: {
      type: "tension_build",
      beats: [
        { text: "三个月后，前公司接到一个大单——甲方指名要她", durationMs: 4000, emotion: "satisfaction", intensity: 5 },
        { text: "老板打来电话：「回来吧，薪水翻倍」", durationMs: 3000, emotion: "superiority", intensity: 7 },
        { text: "她沉默了三秒", durationMs: 2000, emotion: "tension", intensity: 9 },
      ],
    },
    ending: {
      type: "punchline",
      text: "「不了，我现在是甲方」",
      durationMs: 3000,
      shotType: "medium_shot",
      emotion: "triumphant",
    },
    totalDurationMs: 15000,
    retentionScore: 94,
  },

  mystery_encounter: {
    hook: {
      type: "mystery",
      text: "凌晨三点的便利店，她又来了",
      durationMs: 3000,
      shotType: "wide_shot",
      emotion: "intrigue",
      technique: "time + location setting, hint of pattern",
    },
    mid: {
      type: "revelation",
      beats: [
        { text: "每次都买同样的东西：一瓶水、一个饭团、一包创可贴", durationMs: 4000, emotion: "curiosity", intensity: 4 },
        { text: "店员终于忍不住问：「你为什么总买创可贴」", durationMs: 3000, emotion: "concern", intensity: 6 },
        { text: "她卷起袖子，露出满手的伤痕", durationMs: 2500, emotion: "shock", intensity: 9 },
        { text: "「我是外科医生，手总被割到」", durationMs: 3000, emotion: "relief_twist", intensity: 7 },
      ],
    },
    ending: {
      type: "twist",
      text: "她笑了：「不过今天的创可贴是给你的，你手破了」",
      durationMs: 3500,
      shotType: "close_up",
      emotion: "warmth",
    },
    totalDurationMs: 19000,
    retentionScore: 90,
  },

  confession_fail: {
    hook: {
      type: "conflict",
      text: "他鼓起勇气告白，她说：「我们还是做朋友吧」",
      durationMs: 3500,
      shotType: "two_shot",
      emotion: "awkward_pain",
      technique: "open with the rejection, not the buildup",
    },
    mid: {
      type: "emotional_peak",
      beats: [
        { text: "他说「好」，笑着转身走了", durationMs: 2500, emotion: "forced_smile", intensity: 5 },
        { text: "走到拐角，他靠在墙上，深呼吸了很久", durationMs: 3000, emotion: "collapse", intensity: 8 },
        { text: "手机震动：她发来消息「你走太快了，我话还没说完」", durationMs: 3500, emotion: "confusion", intensity: 7 },
      ],
    },
    ending: {
      type: "cliffhanger",
      text: "「我说的是现在还是做朋友，但以后不一定」",
      durationMs: 4000,
      shotType: "close_up",
      emotion: "hope",
    },
    totalDurationMs: 16500,
    retentionScore: 91,
  },

  silent_love: {
    hook: {
      type: "empathy",
      text: "有些人的爱，从来不说出口",
      durationMs: 3000,
      shotType: "medium_shot",
      emotion: "gentle_sadness",
      technique: "universal truth as opening, emotional priming",
    },
    mid: {
      type: "escalation",
      beats: [
        { text: "每天早上，桌上都会多一杯温水", durationMs: 3000, emotion: "routine", intensity: 3 },
        { text: "下雨天，她的伞永远在办公桌旁", durationMs: 2500, emotion: "subtle_care", intensity: 5 },
        { text: "加班到很晚时，门口总有一袋宵夜，没有署名", durationMs: 3000, emotion: "touched", intensity: 7 },
        { text: "有一天她提离职，那杯温水再也没有出现过", durationMs: 3500, emotion: "realization", intensity: 9 },
      ],
    },
    ending: {
      type: "emotional_release",
      text: "她找遍整栋楼，才发现温水是门卫大叔每天六点放的",
      durationMs: 4000,
      shotType: "wide_shot",
      emotion: "overwhelming_gratitude",
    },
    totalDurationMs: 19000,
    retentionScore: 87,
  },

  power_awakening: {
    hook: {
      type: "shock",
      text: "所有人都说他是废物",
      durationMs: 2500,
      shotType: "extreme_close_up",
      emotion: "contempt",
      technique: "universal underdog setup, fast pace",
    },
    mid: {
      type: "escalation",
      beats: [
        { text: "宗门大比，他被安排第一个上场——当炮灰", durationMs: 3500, emotion: "humiliation", intensity: 4 },
        { text: "对手一掌拍来，所有人等着看笑话", durationMs: 3000, emotion: "mockery", intensity: 6 },
        { text: "那一掌落在他身上，他纹丝不动", durationMs: 2500, emotion: "shock", intensity: 8 },
        { text: "他缓缓抬起手，掌心浮现金色符文", durationMs: 3000, emotion: "awe", intensity: 10 },
      ],
    },
    ending: {
      type: "twist",
      text: "「废物？不，我只是懒得跟你们计较」",
      durationMs: 3000,
      shotType: "low_angle",
      emotion: "overwhelming_power",
    },
    totalDurationMs: 17500,
    retentionScore: 93,
  },
};

// ============================================================
// Analyze a script and suggest viral structure
// ============================================================
export function analyzeViralPotential(script: string): {
  hookStrength: number;
  emotionalArc: string;
  suggestedStructure: ViralStructure;
  improvements: string[];
} {
  const lines = script.split("\n").filter((l) => l.trim().length > 0);
  const totalLength = script.length;

  // Hook analysis: first line/paragraph strength
  let hookStrength = 50;
  const firstLine = lines[0] || "";
  // Question hooks score higher
  if (firstLine.includes("?") || firstLine.includes("？")) hookStrength += 15;
  // Conflict/shock keywords
  const hookKeywords = ["突然", "没想到", "不", "谁", "为什么", "竟然", "震惊", "崩溃", "开除", "分手", "死"];
  for (const kw of hookKeywords) {
    if (firstLine.includes(kw)) { hookStrength += 8; break; }
  }
  // Short hooks are punchier
  if (firstLine.length < 15) hookStrength += 10;
  else if (firstLine.length > 30) hookStrength -= 10;
  hookStrength = Math.min(100, Math.max(0, hookStrength));

  // Emotional arc detection
  const emotionKeywords: Record<string, string[]> = {
    sadness: ["哭", "泪", "伤心", "难过", "心碎", "离开"],
    anger: ["愤怒", "生气", "怒", "不公", "欺负"],
    joy: ["笑", "开心", "幸福", "快乐", "感动"],
    tension: ["紧张", "危险", "发现", "秘密", "真相"],
    surprise: ["没想到", "竟然", "反转", "原来", "其实"],
  };
  const detectedEmotions: string[] = [];
  for (const [emotion, kws] of Object.entries(emotionKeywords)) {
    for (const kw of kws) {
      if (script.includes(kw)) { detectedEmotions.push(emotion); break; }
    }
  }
  const emotionalArc = detectedEmotions.length > 0
    ? detectedEmotions.join(" → ")
    : "flat (需要增加情绪波动)";

  // Generate improvements
  const improvements: string[] = [];
  if (hookStrength < 60) improvements.push("HOOK太弱，建议用冲突或悬念开场，前3秒必须抓住注意力");
  if (!detectedEmotions.includes("surprise")) improvements.push("缺少反转，建议在结尾加入出人意料的转折");
  if (lines.length < 3) improvements.push("内容太短，建议增加2-3个情绪递进节拍");
  if (lines.length > 10) improvements.push("内容过长，短视频建议控制在6-8个节拍以内");
  if (!detectedEmotions.includes("tension") && !detectedEmotions.includes("sadness")) {
    improvements.push("缺少情绪张力，建议加入冲突或痛点场景");
  }
  if (totalLength > 500) improvements.push("文字太多，建议精简，短视频以画面叙事为主");

  // Suggest a matching template
  let bestTemplate = "emotion_bar";
  let bestScore = 0;
  const templateEmotionMap: Record<string, string[]> = {
    emotion_bar: ["sadness", "surprise"],
    breakup_moment: ["sadness", "anger"],
    healing_journey: ["sadness", "joy"],
    revenge_calm: ["anger", "surprise"],
    mystery_encounter: ["tension", "surprise"],
    confession_fail: ["tension", "joy"],
    silent_love: ["sadness", "joy"],
    power_awakening: ["anger", "surprise"],
  };
  for (const [key, emotions] of Object.entries(templateEmotionMap)) {
    let score = 0;
    for (const e of emotions) {
      if (detectedEmotions.includes(e)) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestTemplate = key; }
  }

  return {
    hookStrength,
    emotionalArc,
    suggestedStructure: VIRAL_TEMPLATES[bestTemplate],
    improvements,
  };
}

// ============================================================
// Generate a viral-optimized script from idea (AI-powered)
// ============================================================
export async function generateViralScript(
  idea: string,
  template: string,
  config: { duration: number; style: string },
): Promise<ViralStructure> {
  const templateData = VIRAL_TEMPLATES[template];
  if (!templateData) throw new Error(`Unknown template: ${template}`);

  const aiConfig = await u.getPromptAi("viral_script");

  // If no AI config, generate locally based on template
  if (!aiConfig || !("model" in aiConfig) || !aiConfig.model) {
    // Clone the template and adjust timing
    const result: ViralStructure = JSON.parse(JSON.stringify(templateData));
    result.hook.text = idea;
    // Scale durations to match requested duration
    const scaleFactor = config.duration / result.totalDurationMs;
    result.hook.durationMs = Math.round(result.hook.durationMs * scaleFactor);
    result.mid.beats.forEach((b) => { b.durationMs = Math.round(b.durationMs * scaleFactor); });
    result.ending.durationMs = Math.round(result.ending.durationMs * scaleFactor);
    result.totalDurationMs = config.duration;
    return result;
  }

  const systemPrompt = `你是爆款短视频编剧。你的任务是根据用户的想法和参考模板，生成一个完整的爆款短视频结构。

参考模板结构:
${JSON.stringify(templateData, null, 2)}

风格: ${config.style}
目标总时长: ${config.duration}ms

输出要求：
- 严格按照ViralStructure的JSON格式输出
- HOOK必须在前3秒抓住注意力
- MID的情绪强度必须递进（intensity从低到高）
- ENDING必须有记忆点或反转
- 所有text用中文
- retentionScore根据结构质量自评0-100

只输出纯JSON，不要任何其他说明。`;

  const result = await u.ai.text(
    { system: systemPrompt, prompt: `创意想法: ${idea}` },
    aiConfig as any,
  );

  try {
    const parsed = JSON.parse(result.text);
    return parsed as ViralStructure;
  } catch {
    // If parsing fails, return a modified template
    const fallback: ViralStructure = JSON.parse(JSON.stringify(templateData));
    fallback.hook.text = idea;
    fallback.totalDurationMs = config.duration;
    return fallback;
  }
}

// ============================================================
// Convert viral structure to Storyboard DSL shots
// ============================================================
export function viralToShots(
  viral: ViralStructure,
  characters: string[],
  scene: string,
): any[] {
  const shots: any[] = [];
  const mainChar = characters[0] || "主角";

  // HOOK shot
  shots.push({
    shotIndex: 1,
    name: "HOOK",
    type: viral.hook.shotType,
    duration: `${(viral.hook.durationMs / 1000).toFixed(1)}s`,
    durationMs: viral.hook.durationMs,
    dialogue: viral.hook.text,
    emotion: viral.hook.emotion,
    roleRefs: mainChar,
    locationRef: scene,
    cameraMove: "static_hold",
    intro: `[HOOK] ${viral.hook.technique}`,
    transition: "cut",
  });

  // MID beats
  viral.mid.beats.forEach((beat, i) => {
    const shotTypes = ["medium_shot", "close_up", "over_shoulder", "wide_shot", "extreme_close_up"];
    shots.push({
      shotIndex: i + 2,
      name: `MID_${i + 1}`,
      type: shotTypes[i % shotTypes.length],
      duration: `${(beat.durationMs / 1000).toFixed(1)}s`,
      durationMs: beat.durationMs,
      dialogue: beat.text,
      emotion: beat.emotion,
      roleRefs: characters[Math.min(i, characters.length - 1)] || mainChar,
      locationRef: scene,
      cameraMove: beat.intensity > 7 ? "slow_zoom_in" : "static",
      intro: `[MID] intensity=${beat.intensity}/10`,
      transition: beat.intensity > 8 ? "whip_pan" : "cut",
    });
  });

  // ENDING shot
  shots.push({
    shotIndex: shots.length + 1,
    name: "ENDING",
    type: viral.ending.shotType,
    duration: `${(viral.ending.durationMs / 1000).toFixed(1)}s`,
    durationMs: viral.ending.durationMs,
    dialogue: viral.ending.text,
    emotion: viral.ending.emotion,
    roleRefs: mainChar,
    locationRef: scene,
    cameraMove: "slow_pull_back",
    intro: `[ENDING] type=${viral.ending.type}`,
    transition: "fade_to_black",
  });

  return shots;
}

// ============================================================
// Score an existing video structure for retention
// ============================================================
export function scoreRetention(structure: ViralStructure): {
  overall: number;
  hookScore: number;
  paceScore: number;
  endingScore: number;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  // Hook score: based on type, duration, technique
  let hookScore = 50;
  const strongHookTypes = ["conflict", "shock", "mystery"];
  if (strongHookTypes.includes(structure.hook.type)) hookScore += 20;
  if (structure.hook.durationMs >= 2000 && structure.hook.durationMs <= 4000) hookScore += 15;
  else {
    hookScore -= 10;
    suggestions.push("HOOK时长建议2-4秒，太长会流失观众");
  }
  if (structure.hook.technique && structure.hook.technique.length > 10) hookScore += 10;
  if (structure.hook.text.length < 20) hookScore += 5; // Concise hooks win
  hookScore = Math.min(100, Math.max(0, hookScore));

  // Pace score: check intensity progression and beat count
  let paceScore = 50;
  const beats = structure.mid.beats;
  if (beats.length >= 3 && beats.length <= 5) paceScore += 15;
  else if (beats.length < 3) {
    paceScore -= 10;
    suggestions.push("中段节拍太少，建议3-5个情绪递进点");
  } else if (beats.length > 6) {
    paceScore -= 10;
    suggestions.push("中段节拍过多，观众容易疲劳");
  }
  // Check if intensity is increasing
  let isAscending = true;
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].intensity < beats[i - 1].intensity) { isAscending = false; break; }
  }
  if (isAscending) paceScore += 20;
  else {
    paceScore += 5;
    suggestions.push("情绪强度应该递进上升，当前有回落");
  }
  // Check peak intensity
  const maxIntensity = Math.max(...beats.map((b) => b.intensity));
  if (maxIntensity >= 8) paceScore += 10;
  else suggestions.push("情绪高潮不够强烈，建议至少一个节拍intensity>=8");
  paceScore = Math.min(100, Math.max(0, paceScore));

  // Ending score
  let endingScore = 50;
  const strongEndingTypes = ["twist", "punchline", "cliffhanger"];
  if (strongEndingTypes.includes(structure.ending.type)) endingScore += 25;
  if (structure.ending.durationMs >= 2000 && structure.ending.durationMs <= 4000) endingScore += 10;
  if (structure.ending.text.length > 0 && structure.ending.text.length < 30) endingScore += 10;
  else if (structure.ending.text.length >= 30) {
    suggestions.push("结尾台词太长，建议精炼到一句话");
  }
  endingScore = Math.min(100, Math.max(0, endingScore));

  // Total duration check
  if (structure.totalDurationMs > 30000) {
    suggestions.push("总时长超过30秒，爆款短视频建议15-25秒");
  } else if (structure.totalDurationMs < 10000) {
    suggestions.push("总时长太短，建议至少10秒以上");
  }

  const overall = Math.round(hookScore * 0.35 + paceScore * 0.35 + endingScore * 0.3);

  return { overall, hookScore, paceScore, endingScore, suggestions };
}
