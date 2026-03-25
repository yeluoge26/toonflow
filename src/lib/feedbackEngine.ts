import u from "@/utils";

export interface VideoMetrics {
  id?: number;
  videoId: number;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  completionRate: number;    // 0-1
  avgWatchTime: number;      // seconds
  collectedAt: number;
}

export interface VideoFeatures {
  videoId: number;
  hookType: string;          // conflict | question | mystery | emotion
  hookStrength: number;      // 0-100
  emotionPeakIntensity: number;
  pacingScore: number;
  shotDurationAvg: number;
  cameraVariety: number;     // unique camera types used
  styleType: string;
  templateId?: number;
  totalDuration: number;
}

// Calculate viral score from real metrics
export function calculateViralScore(metrics: VideoMetrics): number {
  const completionWeight = 0.30;
  const likeRate = metrics.views > 0 ? metrics.likes / metrics.views : 0;
  const shareRate = metrics.views > 0 ? metrics.shares / metrics.views : 0;
  const watchScore = Math.min(metrics.avgWatchTime / 30, 1); // normalize to 30s target

  return Math.round(
    metrics.completionRate * 100 * completionWeight +
    likeRate * 100 * 25 +  // like_rate * 2500, capped contribution
    shareRate * 100 * 20 +
    watchScore * 100 * 0.25
  );
}

// Detect drop points from watch curve
export function detectDropPoints(watchCurve: number[]): number[] {
  const drops: number[] = [];
  for (let i = 1; i < watchCurve.length; i++) {
    if (watchCurve[i] < watchCurve[i - 1] * 0.7) {
      drops.push(i);
    }
  }
  return drops;
}

// Record video metrics
export async function recordMetrics(metrics: Omit<VideoMetrics, "id">) {
  await u.db("t_video_metrics").insert({ ...metrics, collectedAt: metrics.collectedAt || Date.now() });
}

// Record video features (extracted from generation data)
export async function recordFeatures(features: VideoFeatures) {
  const existing = await u.db("t_video_features").where("videoId", features.videoId).first();
  if (existing) {
    await u.db("t_video_features").where("videoId", features.videoId).update(features);
  } else {
    await u.db("t_video_features").insert(features);
  }
}

// Get metrics for a video
export async function getVideoMetrics(videoId: number) {
  return u.db("t_video_metrics").where("videoId", videoId).orderBy("collectedAt", "desc");
}

// Get aggregate analytics for a project
export async function getProjectAnalytics(projectId: number) {
  const videos = await u.db("t_distribution_task")
    .where("projectId", projectId)
    .where("status", "success")
    .select("videoId", "postId", "platform");

  if (!videos.length) return { totalViews: 0, avgCompletion: 0, topVideo: null, videoCount: 0 };

  const videoIds = videos.map((v: any) => v.videoId);
  const metrics = await u.db("t_video_metrics").whereIn("videoId", videoIds);

  const totalViews = metrics.reduce((s: number, m: any) => s + (m.views || 0), 0);
  const avgCompletion = metrics.length > 0
    ? metrics.reduce((s: number, m: any) => s + (m.completionRate || 0), 0) / metrics.length
    : 0;
  const topVideo = metrics.sort((a: any, b: any) => (b.views || 0) - (a.views || 0))[0] || null;

  return { totalViews, avgCompletion: Math.round(avgCompletion * 100), topVideo, videoCount: videos.length };
}

// AI-analyze what makes videos viral, generate optimization suggestions
export async function analyzeViralPatterns(projectId: number): Promise<{ patterns: string[]; suggestions: string[] }> {
  const features = await u.db("t_video_features")
    .join("t_video_metrics", "t_video_features.videoId", "t_video_metrics.videoId")
    .select("t_video_features.*", "t_video_metrics.views", "t_video_metrics.completionRate", "t_video_metrics.likes");

  if (features.length < 3) return { patterns: ["数据不足，至少需要3个视频的播放数据"], suggestions: ["继续发布视频以积累数据"] };

  // Sort by viral score
  const scored = features.map((f: any) => ({
    ...f,
    viralScore: calculateViralScore({ videoId: f.videoId, platform: "", views: f.views, likes: f.likes, comments: 0, shares: 0, completionRate: f.completionRate, avgWatchTime: 0, collectedAt: 0 }),
  })).sort((a: any, b: any) => b.viralScore - a.viralScore);

  const top = scored.slice(0, Math.ceil(scored.length * 0.3));
  const bottom = scored.slice(-Math.ceil(scored.length * 0.3));

  const patterns: string[] = [];
  const suggestions: string[] = [];

  // Compare top vs bottom
  const avgHookTop = top.reduce((s: number, v: any) => s + v.hookStrength, 0) / top.length;
  const avgHookBottom = bottom.reduce((s: number, v: any) => s + v.hookStrength, 0) / bottom.length;
  if (avgHookTop > avgHookBottom * 1.3) patterns.push(`高分视频Hook强度平均${Math.round(avgHookTop)}，低分仅${Math.round(avgHookBottom)}`);

  const avgPaceTop = top.reduce((s: number, v: any) => s + v.pacingScore, 0) / top.length;
  const avgPaceBottom = bottom.reduce((s: number, v: any) => s + v.pacingScore, 0) / bottom.length;
  if (avgPaceTop > avgPaceBottom * 1.2) patterns.push(`高分视频节奏分${Math.round(avgPaceTop)} vs 低分${Math.round(avgPaceBottom)}`);

  const avgShotTop = top.reduce((s: number, v: any) => s + v.shotDurationAvg, 0) / top.length;
  if (avgShotTop < 3.5) suggestions.push("保持镜头时长在3.5秒以内，快节奏更吸引人");
  else suggestions.push("尝试缩短镜头时长，当前平均" + avgShotTop.toFixed(1) + "秒偏长");

  if (avgHookTop < 70) suggestions.push("前3秒Hook强度不足，建议加入冲突或悬念");

  return { patterns, suggestions };
}

// Update director config based on feedback (self-evolution)
export async function evolveDirectorConfig(projectId: number): Promise<Record<string, any>> {
  const analysis = await analyzeViralPatterns(projectId);
  const adjustments: Record<string, any> = {};

  for (const s of analysis.suggestions) {
    if (s.includes("镜头时长") || s.includes("缩短")) adjustments.rhythmProfile = "fast";
    if (s.includes("Hook") || s.includes("冲突")) adjustments.hookStrategy = "conflict_first";
    if (s.includes("节奏")) adjustments.pacingTarget = 80;
  }

  return { adjustments, patterns: analysis.patterns, suggestions: analysis.suggestions };
}
