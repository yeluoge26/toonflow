import u from "@/utils";
import { db } from "@/utils/db";

// Track API costs for each generation call
interface CostEntry {
  type: string;        // 'text' | 'image' | 'video' | 'audio'
  model: string;
  tokens?: number;
  estimatedCost: number; // in USD
  projectId?: number;
  batchId?: string;
  timestamp: number;
}

// Approximate cost per model (USD)
const MODEL_COSTS: Record<string, number> = {
  // Text models (per 1M tokens)
  "deepseek-chat": 0.14,
  "gpt-4o-mini": 0.15,
  "gpt-4o": 2.5,
  "qwen-plus": 0.8,
  "doubao-pro-256k": 0.5,
  // Image models (per image)
  "doubao-seedream": 0.02,
  "kling": 0.05,
  // Video models (per second)
  "vidu": 0.1,
  "kling-video": 0.15,
  "doubao-seedance": 0.08,
  // Audio (per 1K characters)
  "tts-1-hd": 0.03,
  "cosyvoice": 0.01,
};

class CostTracker {
  private dailyBudget: number = 50;  // USD
  private todayCost: number = 0;
  private costHistory: CostEntry[] = [];
  private dbSynced: boolean = false;

  // Set daily budget
  setBudget(budget: number) {
    this.dailyBudget = budget;
  }

  // Check if we can afford a generation
  canAfford(estimatedCost: number): boolean {
    return (this.todayCost + estimatedCost) <= this.dailyBudget;
  }

  /**
   * Check budget before making a model call.
   * Returns whether the call is allowed and how much budget remains.
   */
  async checkBudget(estimatedCost: number = 0): Promise<{ allowed: boolean; remaining: number }> {
    // Ensure in-memory cache is synced from DB
    await this.syncFromDB();

    const remaining = Math.round((this.dailyBudget - this.todayCost) * 100) / 100;
    const allowed = (this.todayCost + estimatedCost) <= this.dailyBudget;

    if (!allowed) {
      console.warn(`[Cost] Budget exceeded: todayCost=$${this.todayCost.toFixed(4)}, budget=$${this.dailyBudget}, requested=$${estimatedCost.toFixed(4)}`);
    }

    return { allowed, remaining };
  }

  // Record a cost – persist to t_modelUsage and update in-memory cache
  async recordCost(entry: Omit<CostEntry, "timestamp">) {
    const fullEntry = { ...entry, timestamp: Date.now() };
    this.costHistory.push(fullEntry);
    this.todayCost += entry.estimatedCost;

    console.log(`[Cost] ${entry.type}/${entry.model}: $${entry.estimatedCost.toFixed(4)}`);

    // Persist to t_modelUsage
    try {
      await db("t_modelUsage").insert({
        manufacturer: "",
        model: entry.model,
        moduleKey: entry.type,
        inputTokens: entry.tokens || 0,
        outputTokens: 0,
        duration: 0,
        cost: entry.estimatedCost,
        status: "success",
        errorMsg: null,
        projectId: entry.projectId || null,
        batchId: entry.batchId || null,
        createdAt: fullEntry.timestamp,
      });
    } catch (e) {
      // Don't let DB errors break the main flow
      console.error("[Cost] DB persist error:", e);
    }
  }

  /**
   * Sync today's cost from DB into memory cache.
   * Called on first access or when cache may be stale (e.g. after restart).
   */
  async syncFromDB() {
    if (this.dbSynced) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      const result = await db("t_modelUsage")
        .select(db.raw("SUM(cost) as totalCost"), db.raw("COUNT(*) as totalCalls"))
        .where("createdAt", ">=", todayStart)
        .first();

      if (result) {
        this.todayCost = result.totalCost || 0;
      }

      this.dbSynced = true;
    } catch (e) {
      console.error("[Cost] DB sync error:", e);
      // Continue with in-memory values
    }
  }

  // Estimate cost for a batch
  estimateBatchCost(config: {
    count: number;
    textModel?: string;
    imageModel?: string;
    videoModel?: string;
    audioModel?: string;
    avgScriptTokens?: number;
    avgShotsPerVideo?: number;
    avgDurationSeconds?: number;
  }): {
    total: number;
    breakdown: Record<string, number>;
  } {
    const {
      count,
      textModel = "deepseek-chat",
      imageModel = "doubao-seedream",
      videoModel = "doubao-seedance",
      audioModel = "tts-1-hd",
      avgScriptTokens = 2000,
      avgShotsPerVideo = 6,
      avgDurationSeconds = 30,
    } = config;

    const textCostPerUnit = (MODEL_COSTS[textModel] || 0.5) * (avgScriptTokens / 1000000);
    const imageCostPerUnit = (MODEL_COSTS[imageModel] || 0.02) * avgShotsPerVideo;
    const videoCostPerUnit = (MODEL_COSTS[videoModel] || 0.1) * avgDurationSeconds;
    const audioCostPerUnit = (MODEL_COSTS[audioModel] || 0.01) * 5;  // ~5K chars per script

    const scriptTotal = count * textCostPerUnit * 3;  // script + storyboard + prompt optimization
    const imageTotal = count * imageCostPerUnit;
    const videoTotal = count * videoCostPerUnit;
    const audioTotal = count * audioCostPerUnit;
    const total = scriptTotal + imageTotal + videoTotal + audioTotal;

    return {
      total: Math.round(total * 100) / 100,
      breakdown: {
        text: Math.round(scriptTotal * 100) / 100,
        image: Math.round(imageTotal * 100) / 100,
        video: Math.round(videoTotal * 100) / 100,
        audio: Math.round(audioTotal * 100) / 100,
      },
    };
  }

  /**
   * Get today's spending summary – reads from DB for accurate data,
   * falls back to in-memory cache.
   */
  async getTodaySummaryFromDB(): Promise<{
    totalCost: number;
    budget: number;
    remaining: number;
    usagePercent: number;
    byType: Record<string, number>;
    totalCalls: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    try {
      const rows = await db("t_modelUsage")
        .select("moduleKey", db.raw("SUM(cost) as totalCost"), db.raw("COUNT(*) as calls"))
        .where("createdAt", ">=", todayStart)
        .groupBy("moduleKey");

      const byType: Record<string, number> = {};
      let totalCost = 0;
      let totalCalls = 0;

      for (const row of rows) {
        const cost = row.totalCost || 0;
        byType[row.moduleKey || "unknown"] = Math.round(cost * 10000) / 10000;
        totalCost += cost;
        totalCalls += row.calls || 0;
      }

      // Update in-memory cache
      this.todayCost = totalCost;

      return {
        totalCost: Math.round(totalCost * 100) / 100,
        budget: this.dailyBudget,
        remaining: Math.round((this.dailyBudget - totalCost) * 100) / 100,
        usagePercent: Math.round((totalCost / this.dailyBudget) * 100),
        byType,
        totalCalls,
      };
    } catch {
      // Fallback to in-memory
      return this.getTodaySummary();
    }
  }

  // In-memory summary (kept for backward compat and as fallback)
  getTodaySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayEntries = this.costHistory.filter(e => e.timestamp >= todayStart);
    const byType: Record<string, number> = {};

    for (const entry of todayEntries) {
      byType[entry.type] = (byType[entry.type] || 0) + entry.estimatedCost;
    }

    return {
      totalCost: Math.round(this.todayCost * 100) / 100,
      budget: this.dailyBudget,
      remaining: Math.round((this.dailyBudget - this.todayCost) * 100) / 100,
      usagePercent: Math.round((this.todayCost / this.dailyBudget) * 100),
      byType,
      totalCalls: todayEntries.length,
    };
  }

  /**
   * Get cost breakdown for a specific project (from DB).
   */
  async getProjectCost(projectId: number): Promise<{
    projectId: number;
    totalCost: number;
    byModel: Array<{ model: string; type: string; cost: number; calls: number }>;
    byDate: Array<{ date: string; cost: number; calls: number }>;
  }> {
    const byModel = await db("t_modelUsage")
      .select(
        "model",
        "moduleKey as type",
        db.raw("SUM(cost) as cost"),
        db.raw("COUNT(*) as calls"),
      )
      .where("projectId", projectId)
      .groupBy("model", "moduleKey")
      .catch(() => []);

    const byDate = await db("t_modelUsage")
      .select(
        db.raw("DATE(createdAt / 1000, 'unixepoch', 'localtime') as date"),
        db.raw("SUM(cost) as cost"),
        db.raw("COUNT(*) as calls"),
      )
      .where("projectId", projectId)
      .groupBy(db.raw("DATE(createdAt / 1000, 'unixepoch', 'localtime')"))
      .orderBy("date", "desc")
      .catch(() => []);

    const totalCost = byModel.reduce((sum: number, row: any) => sum + (row.cost || 0), 0);

    return {
      projectId,
      totalCost: Math.round(totalCost * 10000) / 10000,
      byModel: byModel.map((r: any) => ({
        model: r.model,
        type: r.type,
        cost: Math.round((r.cost || 0) * 10000) / 10000,
        calls: r.calls || 0,
      })),
      byDate: byDate.map((r: any) => ({
        date: r.date,
        cost: Math.round((r.cost || 0) * 10000) / 10000,
        calls: r.calls || 0,
      })),
    };
  }

  /**
   * Get cost breakdown for a specific batch (from DB).
   */
  async getBatchCost(batchId: string): Promise<{
    batchId: string;
    totalCost: number;
    byModel: Array<{ model: string; type: string; cost: number; calls: number }>;
  }> {
    const byModel = await db("t_modelUsage")
      .select(
        "model",
        "moduleKey as type",
        db.raw("SUM(cost) as cost"),
        db.raw("COUNT(*) as calls"),
      )
      .where("batchId", batchId)
      .groupBy("model", "moduleKey")
      .catch(() => []);

    const totalCost = byModel.reduce((sum: number, row: any) => sum + (row.cost || 0), 0);

    return {
      batchId,
      totalCost: Math.round(totalCost * 10000) / 10000,
      byModel: byModel.map((r: any) => ({
        model: r.model,
        type: r.type,
        cost: Math.round((r.cost || 0) * 10000) / 10000,
        calls: r.calls || 0,
      })),
    };
  }

  // Reset daily counter (call at midnight)
  resetDaily() {
    this.todayCost = 0;
    this.dbSynced = false;
  }
}

const costTracker = new CostTracker();
export default costTracker;
