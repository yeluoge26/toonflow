import u from "@/utils";

// Platform adapters
export type Platform = "tiktok" | "youtube" | "instagram" | "douyin" | "bilibili";

export interface AccountConfig {
  id?: number;
  platform: Platform;
  username: string;
  status: "active" | "cooldown" | "banned" | "risk";
  proxyIp?: string;
  deviceFingerprint?: string; // JSON
  cookies?: string;
  accessToken?: string;
  lastActiveAt?: number;
  postsToday: number;
  createdAt?: number;
}

export interface PublishTask {
  id?: number;
  videoId: number;
  projectId: number;
  accountId: number;
  platform: Platform;
  status: "pending" | "scheduled" | "publishing" | "success" | "failed" | "retry";
  title: string;
  description: string;
  tags: string; // JSON array
  coverUrl?: string;
  scheduledAt?: number;
  publishedAt?: number;
  postId?: string; // Platform's post ID after publish
  retryCount: number;
  errorMsg?: string;
  createdAt: number;
}

export interface PublishStrategy {
  maxPostsPerDay: number;       // per account
  timeSlots: string[];           // ["12:00", "18:00", "22:00"]
  intervalMinutes: number;       // min gap between posts
  cooldownAfterFail: number;     // minutes
  retryMax: number;
}

// Default strategy
export const DEFAULT_STRATEGY: PublishStrategy = {
  maxPostsPerDay: 3,
  timeSlots: ["12:00", "18:00", "22:00"],
  intervalMinutes: 120,
  cooldownAfterFail: 30,
  retryMax: 3,
};

// AI-generate title variations for A/B testing
export async function generateTitles(scriptSummary: string, count: number = 3): Promise<string[]> {
  const config = await u.getPromptAi("outlineScriptAgent");
  if (!config || !('apiKey' in config)) return [scriptSummary.substring(0, 50)];
  const result = await u.ai.text.invoke({
    messages: [
      { role: "system", content: "你是短视频标题专家。生成吸引点击的标题，每个不超过30字。要求：制造悬念、引发好奇、带情绪。直接输出JSON数组。" },
      { role: "user", content: `为以下内容生成${count}个爆款标题：\n${scriptSummary.substring(0, 500)}` },
    ],
  }, config);
  try { const m = result.text.match(/\[[\s\S]*?\]/); return m ? JSON.parse(m[0]) : [scriptSummary.substring(0, 50)]; }
  catch { return [scriptSummary.substring(0, 50)]; }
}

// AI-generate tags
export async function generateTags(title: string, platform: Platform): Promise<string[]> {
  const config = await u.getPromptAi("outlineScriptAgent");
  if (!config || !('apiKey' in config)) return ["短剧", "AI", platform];
  const result = await u.ai.text.invoke({
    messages: [
      { role: "system", content: `你是${platform}平台的SEO专家。为短视频生成热门标签，每个标签带#号。输出JSON数组，5-10个标签。` },
      { role: "user", content: `标题：${title}` },
    ],
  }, config);
  try { const m = result.text.match(/\[[\s\S]*?\]/); return m ? JSON.parse(m[0]) : ["短剧", "AI"]; }
  catch { return ["短剧", "AI"]; }
}

// Select best account for publishing (load balancing)
export async function selectAccount(platform: Platform): Promise<AccountConfig | null> {
  const accounts = await u.db("t_distribution_account")
    .where({ platform, status: "active" })
    .where("postsToday", "<", DEFAULT_STRATEGY.maxPostsPerDay)
    .orderBy("postsToday", "asc")
    .orderBy("lastActiveAt", "asc");
  return accounts[0] || null;
}

// Calculate optimal publish time
export function getNextPublishSlot(strategy: PublishStrategy): Date {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  for (const slot of strategy.timeSlots) {
    const slotTime = new Date(`${today}T${slot}:00`);
    if (slotTime > now) return slotTime;
  }
  const tomorrow = new Date(now.getTime() + 86400000);
  return new Date(`${tomorrow.toISOString().split("T")[0]}T${strategy.timeSlots[0]}:00`);
}

// Create a publish task
export async function createPublishTask(params: {
  videoId: number; projectId: number; platform: Platform;
  title?: string; description?: string; scheduledAt?: number;
}): Promise<PublishTask> {
  const account = await selectAccount(params.platform);
  if (!account) throw new Error(`无可用${params.platform}账号`);
  const title = params.title || "AI短剧";
  const tags = await generateTags(title, params.platform);
  const task: Partial<PublishTask> = {
    videoId: params.videoId, projectId: params.projectId,
    accountId: account.id!, platform: params.platform,
    status: params.scheduledAt ? "scheduled" : "pending",
    title, description: params.description || title,
    tags: JSON.stringify(tags),
    scheduledAt: params.scheduledAt || Date.now(),
    retryCount: 0, createdAt: Date.now(),
  };
  const [id] = await u.db("t_distribution_task").insert(task);
  return { ...task, id } as PublishTask;
}

// Get publish history
export async function getPublishHistory(projectId?: number, limit: number = 50) {
  let q = u.db("t_distribution_task").orderBy("createdAt", "desc").limit(limit);
  if (projectId) q = q.where("projectId", projectId);
  return q;
}

// Update task status
export async function updateTaskStatus(taskId: number, status: string, extra?: { postId?: string; errorMsg?: string }) {
  const update: any = { status, ...(extra || {}) };
  if (status === "success") update.publishedAt = Date.now();
  await u.db("t_distribution_task").where("id", taskId).update(update);
  // Update account post count
  if (status === "success") {
    const task = await u.db("t_distribution_task").where("id", taskId).first();
    if (task) await u.db("t_distribution_account").where("id", task.accountId).increment("postsToday", 1).update({ lastActiveAt: Date.now() });
  }
}

// Reset daily post counts (should be called by cron/scheduler)
export async function resetDailyPostCounts() {
  await u.db("t_distribution_account").update({ postsToday: 0 });
}
