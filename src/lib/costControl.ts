import u from "@/utils";

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

  // Set daily budget
  setBudget(budget: number) {
    this.dailyBudget = budget;
  }

  // Check if we can afford a generation
  canAfford(estimatedCost: number): boolean {
    return (this.todayCost + estimatedCost) <= this.dailyBudget;
  }

  // Record a cost
  async recordCost(entry: Omit<CostEntry, "timestamp">) {
    const fullEntry = { ...entry, timestamp: Date.now() };
    this.costHistory.push(fullEntry);
    this.todayCost += entry.estimatedCost;

    // Persist to database (using t_metrics or a dedicated cost table)
    // For now, log it
    console.log(`[Cost] ${entry.type}/${entry.model}: $${entry.estimatedCost.toFixed(4)}`);
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

  // Get today's spending summary
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

  // Reset daily counter (call at midnight)
  resetDaily() {
    this.todayCost = 0;
  }
}

const costTracker = new CostTracker();
export default costTracker;
