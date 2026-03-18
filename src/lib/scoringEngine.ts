import u from "@/utils";

// Score weights for the production scoring formula
const WEIGHTS = {
  hook: 0.30,       // 前3秒钩子强度
  emotion: 0.25,    // 情绪曲线质量
  conflict: 0.15,   // 冲突强度
  visual: 0.15,     // 视觉质量
  audio: 0.15,      // 音频质量
};

// Score thresholds for auto-filtering
const THRESHOLDS = {
  low: 5.0,          // < 5.0 → 丢弃
  medium: 7.0,       // 5.0-7.0 → 人工复审
  high: 8.0,         // > 7.0 → 自动发布候选
};

export interface ScoreResult {
  hookScore: number;
  emotionScore: number;
  conflictScore: number;
  visualScore: number;
  audioScore: number;
  finalScore: number;
  label: "low" | "medium" | "high";
  details: ScoreDetails;
}

interface ScoreDetails {
  hookAnalysis: string;
  emotionAnalysis: string;
  conflictAnalysis: string;
  suggestions: string[];
}

// Main scoring function - analyzes a project's content quality
export async function scoreProject(projectId: number): Promise<ScoreResult> {
  // Get project data
  const project = await u.db("t_project").where("id", projectId).first();
  const scripts = await u.db("t_script").where("projectId", projectId).select("content");
  const scriptContent = scripts.map((s: any) => s.content).join("\n");

  // Score each dimension
  const hookScore = analyzeHook(scriptContent);
  const emotionScore = analyzeEmotion(scriptContent);
  const conflictScore = analyzeConflict(scriptContent);
  const visualScore = 7.0;  // Default - will be enhanced with actual image analysis
  const audioScore = 7.0;   // Default - will be enhanced with actual audio analysis

  // Calculate final score
  const finalScore =
    WEIGHTS.hook * hookScore +
    WEIGHTS.emotion * emotionScore +
    WEIGHTS.conflict * conflictScore +
    WEIGHTS.visual * visualScore +
    WEIGHTS.audio * audioScore;

  // Determine label
  let label: "low" | "medium" | "high" = "medium";
  if (finalScore < THRESHOLDS.low) label = "low";
  else if (finalScore >= THRESHOLDS.medium) label = "high";

  const details: ScoreDetails = {
    hookAnalysis: hookScore >= 7 ? "开头钩子强" : hookScore >= 5 ? "开头一般" : "缺少吸引力开头",
    emotionAnalysis: emotionScore >= 7 ? "情绪递进好" : "情绪较平淡",
    conflictAnalysis: conflictScore >= 7 ? "冲突明确" : "冲突不够明显",
    suggestions: generateSuggestions(hookScore, emotionScore, conflictScore),
  };

  // Save to database
  await u.db("t_scores").insert({
    projectId,
    hookScore,
    emotionScore,
    visualScore,
    audioScore,
    conflictScore,
    finalScore: Math.round(finalScore * 10) / 10,
    label,
    details: JSON.stringify(details),
    createdAt: Date.now(),
  });

  return { hookScore, emotionScore, conflictScore, visualScore, audioScore, finalScore: Math.round(finalScore * 10) / 10, label, details };
}

// Analyze hook strength (first 3 seconds / first paragraph)
function analyzeHook(content: string): number {
  if (!content) return 3.0;

  const firstParagraph = content.split("\n").find(l => l.trim().length > 10) || "";
  let score = 5.0;

  // Check for strong hooks
  const hookPatterns = [
    { pattern: /[！!]{1,}/, weight: 0.5, name: "exclamation" },
    { pattern: /[？?]/, weight: 0.5, name: "question" },
    { pattern: /(突然|忽然|猛然|瞬间)/, weight: 1.0, name: "sudden_action" },
    { pattern: /(不可能|怎么会|竟然|没想到)/, weight: 1.0, name: "surprise" },
    { pattern: /(你敢|谁给你|滚|闭嘴|住手)/, weight: 0.8, name: "confrontation" },
    { pattern: /"[^"]{1,20}"/, weight: 0.5, name: "dialogue_opening" },
    { pattern: /(死|血|杀|消失|失踪)/, weight: 0.8, name: "high_stakes" },
  ];

  for (const { pattern, weight } of hookPatterns) {
    if (pattern.test(firstParagraph)) {
      score += weight;
    }
  }

  // Penalize slow starts
  if (firstParagraph.length > 100 && !/[！!？?]/.test(firstParagraph)) {
    score -= 1.0; // Too long without punch
  }

  return Math.min(10, Math.max(1, score));
}

// Analyze emotion curve
function analyzeEmotion(content: string): number {
  if (!content) return 3.0;

  let score = 5.0;
  const paragraphs = content.split("\n").filter(l => l.trim().length > 5);

  // Check for emotional keywords
  const emotionKeywords = {
    positive: /(笑|开心|幸福|感动|温暖|甜蜜|喜悦)/g,
    negative: /(哭|悲伤|痛苦|绝望|愤怒|心碎|崩溃)/g,
    surprise: /(震惊|惊讶|不敢相信|目瞪口呆|傻眼)/g,
    tension: /(紧张|害怕|恐惧|颤抖|心跳加速)/g,
  };

  let emotionCount = 0;
  let emotionTypes = new Set<string>();

  for (const [type, regex] of Object.entries(emotionKeywords)) {
    const matches = content.match(regex);
    if (matches) {
      emotionCount += matches.length;
      emotionTypes.add(type);
    }
  }

  // More emotion types = better curve
  score += emotionTypes.size * 0.5;

  // Some emotion density is good
  const density = emotionCount / paragraphs.length;
  if (density > 0.3 && density < 2.0) score += 1.5;
  else if (density > 0) score += 0.5;

  // Check for emotional contrast (positive → negative or vice versa)
  if (emotionTypes.has("positive") && emotionTypes.has("negative")) {
    score += 1.0; // Emotional contrast is powerful
  }

  return Math.min(10, Math.max(1, score));
}

// Analyze conflict intensity
function analyzeConflict(content: string): number {
  if (!content) return 3.0;

  let score = 5.0;

  const conflictPatterns = [
    { pattern: /(对峙|争吵|吵架|打架|冲突)/, weight: 1.0 },
    { pattern: /(背叛|欺骗|谎言|隐瞒|秘密)/, weight: 1.0 },
    { pattern: /(反转|真相|揭露|暴露|原来)/, weight: 1.5 },
    { pattern: /(你滚|我恨你|再也不|永远不)/, weight: 0.8 },
    { pattern: /(选择|两难|放弃|牺牲)/, weight: 0.5 },
    { pattern: /【黑屏】/, weight: 0.3 },  // Cliffhanger ending
  ];

  for (const { pattern, weight } of conflictPatterns) {
    if (pattern.test(content)) {
      score += weight;
    }
  }

  // Check for dialogue-driven conflict
  const dialogueConflicts = content.match(/"[^"]*[！!][^"]*"/g);
  if (dialogueConflicts && dialogueConflicts.length >= 2) {
    score += 1.0;
  }

  return Math.min(10, Math.max(1, score));
}

// Generate improvement suggestions
function generateSuggestions(hook: number, emotion: number, conflict: number): string[] {
  const suggestions: string[] = [];

  if (hook < 6) suggestions.push("建议在开头3秒内加入强冲突或悬念钩子");
  if (hook < 4) suggestions.push("开头太平淡，建议用对话或突发事件开场");
  if (emotion < 6) suggestions.push("情绪波动不够，建议增加情感转折点");
  if (emotion < 4) suggestions.push("严重缺乏情绪，建议加入角色内心独白或表情描写");
  if (conflict < 6) suggestions.push("冲突不够明显，建议增加角色对立或反转");
  if (conflict < 4) suggestions.push("几乎没有冲突，建议重构剧情加入核心矛盾");

  if (suggestions.length === 0) suggestions.push("内容质量良好，可以进入发布流程");

  return suggestions;
}

// AI-powered scoring (advanced - uses LLM to analyze)
export async function aiScoreProject(projectId: number): Promise<ScoreResult | null> {
  try {
    const project = await u.db("t_project").where("id", projectId).first();
    const scripts = await u.db("t_script").where("projectId", projectId).select("content");
    const scriptContent = scripts.map((s: any) => s.content).join("\n");

    if (!scriptContent) return null;

    // Try to use AI for more accurate scoring
    const promptAi = await u.getPromptAi("generateScript") as any;
    if (!promptAi?.config) {
      // Fallback to rule-based scoring
      return scoreProject(projectId);
    }

    const result = await (u.ai.text as any).invoke({
      config: promptAi.config,
      system: `你是短视频内容评分专家。请对以下剧本进行专业评分。

评分维度（每项1-10分）：
1. hook_score: 前3秒钩子强度（是否有悬念/冲突/情绪冲击）
2. emotion_score: 情绪曲线质量（是否有起伏/高潮/转折）
3. conflict_score: 冲突强度（是否有明确对立/反转）
4. suggestions: 改进建议（数组，最多3条）

严格输出JSON格式：
{"hook_score":8,"emotion_score":7,"conflict_score":9,"suggestions":["建议1","建议2"]}`,
      prompt: scriptContent.slice(0, 2000),
      responseFormat: "object",
    });

    if (result && typeof result === "object") {
      const r = result as any;
      const hookScore = Math.min(10, Math.max(1, Number(r.hook_score) || 5));
      const emotionScore = Math.min(10, Math.max(1, Number(r.emotion_score) || 5));
      const conflictScore = Math.min(10, Math.max(1, Number(r.conflict_score) || 5));
      const visualScore = 7.0;
      const audioScore = 7.0;

      const finalScore = WEIGHTS.hook * hookScore + WEIGHTS.emotion * emotionScore + WEIGHTS.conflict * conflictScore + WEIGHTS.visual * visualScore + WEIGHTS.audio * audioScore;

      let label: "low" | "medium" | "high" = "medium";
      if (finalScore < THRESHOLDS.low) label = "low";
      else if (finalScore >= THRESHOLDS.medium) label = "high";

      const scoreResult: ScoreResult = {
        hookScore, emotionScore, conflictScore, visualScore, audioScore,
        finalScore: Math.round(finalScore * 10) / 10,
        label,
        details: {
          hookAnalysis: hookScore >= 7 ? "AI评估：钩子强" : "AI评估：钩子偏弱",
          emotionAnalysis: emotionScore >= 7 ? "AI评估：情绪好" : "AI评估：情绪平淡",
          conflictAnalysis: conflictScore >= 7 ? "AI评估：冲突明确" : "AI评估：冲突不足",
          suggestions: r.suggestions || [],
        },
      };

      await u.db("t_scores").insert({
        projectId,
        hookScore, emotionScore, visualScore, audioScore, conflictScore,
        finalScore: scoreResult.finalScore,
        label,
        details: JSON.stringify(scoreResult.details),
        createdAt: Date.now(),
      });

      return scoreResult;
    }
  } catch (err) {
    console.error("AI scoring failed, falling back to rule-based:", err);
  }

  return scoreProject(projectId);
}

// Auto-filter: determine what to do with scored content
export function autoFilter(score: ScoreResult): "discard" | "review" | "publish" {
  if (score.finalScore < THRESHOLDS.low) return "discard";
  if (score.finalScore >= THRESHOLDS.medium) return "publish";
  return "review";
}

// Calculate real-world performance score from metrics
export function calculatePerformanceScore(metrics: {
  views: number;
  likeRate: number;
  completionRate: number;
  shareRate: number;
}): number {
  return (
    0.3 * Math.log(metrics.views + 1) / Math.log(1000000) * 10 +  // normalize to 0-10
    0.3 * metrics.likeRate * 100 +  // like rate as percentage
    0.3 * metrics.completionRate * 10 +
    0.1 * metrics.shareRate * 200
  );
}
