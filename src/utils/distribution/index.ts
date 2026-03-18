// Video auto-distribution module
// Supports publishing to multiple platforms

export interface DistributionPlatform {
  name: string; // 'douyin' | 'tiktok' | 'kuaishou' | 'bilibili'
  enabled: boolean;
  apiKey?: string;
  accessToken?: string;
}

export interface PublishRequest {
  videoPath: string; // path to video file
  title: string;
  description: string;
  coverImage?: string; // cover image path
  tags: string[];
  platform: string;
  projectId: number;
  scheduleTime?: number; // timestamp for scheduled publishing
}

export interface PublishResult {
  success: boolean;
  platform: string;
  postId?: string; // platform's post ID
  postUrl?: string; // URL to the published post
  error?: string;
}

// Auto-generate title from script content
export async function generateTitle(scriptContent: string, style: "hook" | "descriptive" | "question" = "hook"): Promise<string> {
  try {
    const u = (await import("@/utils")).default;

    // Try to use AI for title generation
    const aiModelMap = await u.db("t_aiModelMap").where("key", "generateScript").first();
    if (aiModelMap?.configId) {
      const config = await u.db("t_config").where("id", aiModelMap.configId).first();
      if (config) {
        const stylePrompts: Record<string, string> = {
          hook: "生成一个吸引人的短视频标题，要有悬念感和点击欲望，不超过20字",
          descriptive: "生成一个描述性的短视频标题，简洁明了概括内容，不超过20字",
          question: "生成一个疑问式短视频标题，引发观众好奇心，不超过20字",
        };

        const result = await u.ai.text.invoke(
          {
            messages: [
              { role: "system", content: "你是短视频标题生成专家。只输出标题本身，不要引号和其他内容。" },
              { role: "user", content: `${stylePrompts[style]}\n\n剧本内容摘要：\n${scriptContent.slice(0, 500)}` },
            ],
          },
          {
            model: config.model ?? "",
            apiKey: config.apiKey ?? "",
            baseURL: config.baseUrl ?? "",
            manufacturer: config.manufacturer ?? "",
          },
        );

        const text = result?.text;
        if (text && typeof text === "string" && text.trim().length > 0) {
          return text.trim().slice(0, 30);
        }
      }
    }
  } catch {}

  // Fallback: extract first meaningful line
  const lines = scriptContent.split("\n").filter((l) => l.trim().length > 5);
  return (lines[0] || "未命名视频").slice(0, 30);
}

// Auto-generate cover from storyboard frames
export async function selectBestCoverFrame(storyboardImages: string[]): Promise<string | null> {
  if (storyboardImages.length === 0) return null;

  // Strategy: pick frame at ~60% (usually near the climax)
  // and also the first and last as alternatives
  const climaxIndex = Math.floor(storyboardImages.length * 0.6);

  return storyboardImages[climaxIndex] || storyboardImages[0] || null;
}

// Generate multiple title options for A/B testing
export async function generateTitleOptions(scriptContent: string): Promise<string[]> {
  const styles: Array<"hook" | "descriptive" | "question"> = ["hook", "descriptive", "question"];
  const titles = await Promise.all(
    styles.map((style) => generateTitle(scriptContent, style))
  );
  return titles.filter((t) => t && t !== "未命名视频");
}

// Auto-generate tags from project and script content
export function generateTags(project: { type?: string; artStyle?: string; name?: string }, scriptContent: string): string[] {
  const tags: string[] = [];

  if (project.type) tags.push(project.type);
  if (project.artStyle) tags.push(project.artStyle);
  tags.push("AI短剧", "ToonFlow");

  // Extract character names as tags (simple regex for Chinese names)
  const nameRegex = /([^\s"：]{2,4})[：:]/g;
  const names = new Set<string>();
  let match;
  while ((match = nameRegex.exec(scriptContent)) !== null) {
    if (names.size < 5) names.add(match[1]);
  }
  tags.push(...names);

  return [...new Set(tags)];
}

// Publish to platform
export async function publishVideo(request: PublishRequest): Promise<PublishResult> {
  switch (request.platform) {
    case "douyin":
      return await publishToDouyin(request);
    case "tiktok":
      return await publishToTikTok(request);
    case "bilibili":
      return await publishToBilibili(request);
    case "kuaishou":
      return await publishToKuaishou(request);
    default:
      return { success: false, platform: request.platform, error: `不支持的平台: ${request.platform}` };
  }
}

// Platform stubs
async function publishToDouyin(request: PublishRequest): Promise<PublishResult> {
  // TODO: Implement Douyin Open Platform API
  return { success: false, platform: "douyin", error: "抖音发布功能开发中" };
}

async function publishToTikTok(request: PublishRequest): Promise<PublishResult> {
  // TODO: Implement TikTok Creator API
  return { success: false, platform: "tiktok", error: "TikTok发布功能开发中" };
}

async function publishToBilibili(request: PublishRequest): Promise<PublishResult> {
  // TODO: Implement Bilibili API
  return { success: false, platform: "bilibili", error: "B站发布功能开发中" };
}

async function publishToKuaishou(request: PublishRequest): Promise<PublishResult> {
  // TODO: Implement Kuaishou API
  return { success: false, platform: "kuaishou", error: "快手发布功能开发中" };
}
