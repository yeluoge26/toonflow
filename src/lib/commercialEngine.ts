import u from "@/utils";

// ==================== Template Market ====================

export interface MarketTemplate {
  id?: number;
  name: string;
  category: string;          // romance | suspense | comedy | horror | fantasy
  description: string;
  authorId: number;
  viralScore: number;        // 0-100 based on actual usage data
  usageCount: number;
  avgCompletionRate: number;
  price: number;             // 0 = free
  currency: string;          // CNY | USD
  templateData: string;      // JSON: full template config
  thumbnailUrl?: string;
  status: "draft" | "published" | "archived";
  createdAt: number;
}

// List templates for marketplace
export async function listMarketTemplates(params: {
  category?: string; sortBy?: string; page?: number; pageSize?: number; free?: boolean;
}) {
  let q = u.db("t_market_template").where("status", "published");
  if (params.category) q = q.where("category", params.category);
  if (params.free) q = q.where("price", 0);

  const sortMap: Record<string, string> = {
    popular: "usageCount", viral: "viralScore", newest: "createdAt", price: "price",
  };
  q = q.orderBy(sortMap[params.sortBy || "popular"] || "usageCount", "desc");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const total = await q.clone().count("* as c").first().then((r: any) => r?.c || 0);
  const items = await q.limit(pageSize).offset((page - 1) * pageSize);

  return { items, total, page, pageSize };
}

// Publish a template to marketplace
export async function publishTemplate(template: Omit<MarketTemplate, "id" | "usageCount" | "avgCompletionRate" | "viralScore">) {
  const [id] = await u.db("t_market_template").insert({
    ...template, usageCount: 0, avgCompletionRate: 0, viralScore: 0, createdAt: Date.now(),
  });
  return id;
}

// Use (buy/claim) a template
export async function useTemplate(templateId: number, userId: number): Promise<{ success: boolean; templateData?: any; error?: string }> {
  const template = await u.db("t_market_template").where("id", templateId).first();
  if (!template) return { success: false, error: "模板不存在" };

  if (template.price > 0) {
    // Check user balance
    const user = await u.db("t_user_billing").where("userId", userId).first();
    if (!user || user.credits < template.price) return { success: false, error: "余额不足" };
    // Deduct
    await u.db("t_user_billing").where("userId", userId).decrement("credits", template.price);
    // Revenue to author (70%)
    const authorRevenue = Math.round(template.price * 0.7);
    await u.db("t_revenue").insert({
      userId: template.authorId, source: "template_sale", amount: authorRevenue,
      referenceId: templateId, createdAt: Date.now(),
    });
    // Platform revenue (30%)
    await u.db("t_revenue").insert({
      userId: 0, source: "platform_commission", amount: template.price - authorRevenue,
      referenceId: templateId, createdAt: Date.now(),
    });
    // Record transaction
    await u.db("t_transaction").insert({
      userId, type: "template_purchase", amount: -template.price,
      referenceId: templateId, createdAt: Date.now(),
    });
  }

  // Increment usage
  await u.db("t_market_template").where("id", templateId).increment("usageCount", 1);

  return { success: true, templateData: JSON.parse(template.templateData || "{}") };
}

// ==================== SaaS Billing ====================

export type PlanType = "free" | "pro" | "studio";

export const PLANS: Record<PlanType, { name: string; price: number; limits: Record<string, number> }> = {
  free: {
    name: "Free", price: 0,
    limits: { projectsPerMonth: 3, episodesPerProject: 5, imageGenerations: 50, videoGenerations: 10, publishPerDay: 1 },
  },
  pro: {
    name: "Pro", price: 29,
    limits: { projectsPerMonth: 20, episodesPerProject: 20, imageGenerations: 500, videoGenerations: 100, publishPerDay: 10 },
  },
  studio: {
    name: "Studio", price: 199,
    limits: { projectsPerMonth: -1, episodesPerProject: -1, imageGenerations: -1, videoGenerations: -1, publishPerDay: -1 }, // -1 = unlimited
  },
};

// Check if user can perform action
export async function checkQuota(userId: number, action: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const billing = await u.db("t_user_billing").where("userId", userId).first();
  const plan = PLANS[(billing?.plan as PlanType) || "free"];
  const limit = plan.limits[action] || 0;

  if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };

  // Count usage this month
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const usage = await u.db("t_usage_log")
    .where({ userId, action })
    .where("createdAt", ">=", monthStart.getTime())
    .count("* as c").first().then((r: any) => Number(r?.c || 0));

  return { allowed: usage < limit, remaining: Math.max(0, limit - usage), limit };
}

// Record usage
export async function recordUsage(userId: number, action: string, cost?: number) {
  await u.db("t_usage_log").insert({ userId, action, cost: cost || 0, createdAt: Date.now() });
}

// ==================== Revenue System ====================

// Get revenue summary for user
export async function getRevenueSummary(userId: number) {
  const total = await u.db("t_revenue").where("userId", userId).sum("amount as total").first();
  const thisMonth = await u.db("t_revenue").where("userId", userId)
    .where("createdAt", ">=", new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime())
    .sum("amount as total").first();
  const bySource = await u.db("t_revenue").where("userId", userId)
    .select("source").sum("amount as total").groupBy("source");

  return {
    totalRevenue: total?.total || 0,
    monthRevenue: thisMonth?.total || 0,
    bySource: bySource.reduce((acc: any, r: any) => ({ ...acc, [r.source]: r.total }), {}),
  };
}

// Calculate ROI for a project
export async function calculateROI(projectId: number) {
  // Revenue from video metrics (estimated CPM)
  const metrics = await u.db("t_video_metrics")
    .join("t_distribution_task", "t_video_metrics.videoId", "t_distribution_task.videoId")
    .where("t_distribution_task.projectId", projectId)
    .select("t_video_metrics.views", "t_video_metrics.platform");

  const totalViews = metrics.reduce((s: number, m: any) => s + (m.views || 0), 0);
  const estimatedRevenue = totalViews / 1000 * 2; // $2 CPM estimate

  // Cost from t_modelUsage
  const cost = await u.db("t_modelUsage").where("projectId", projectId).sum("cost as total").first();
  const totalCost = cost?.total || 0;

  return {
    revenue: Math.round(estimatedRevenue * 100) / 100,
    cost: Math.round(totalCost * 100) / 100,
    roi: totalCost > 0 ? Math.round((estimatedRevenue - totalCost) / totalCost * 100) : 0,
    views: totalViews,
  };
}
