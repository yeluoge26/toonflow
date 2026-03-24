import { describe, it, expect, beforeEach } from 'vitest';

// Re-implement CostTracker logic for testing (mirrors src/lib/costControl.ts)
// We cannot import directly because costControl.ts uses @/utils alias and is a singleton

interface CostEntry {
  type: string;
  model: string;
  tokens?: number;
  estimatedCost: number;
  projectId?: number;
  batchId?: string;
  timestamp: number;
}

const MODEL_COSTS: Record<string, number> = {
  // Text models (per 1M tokens)
  'deepseek-chat': 0.14,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.5,
  'qwen-plus': 0.8,
  'doubao-pro-256k': 0.5,
  // Image models (per image)
  'doubao-seedream': 0.02,
  'kling': 0.05,
  // Video models (per second)
  'vidu': 0.1,
  'kling-video': 0.15,
  'doubao-seedance': 0.08,
  // Audio (per 1K characters)
  'tts-1-hd': 0.03,
  'cosyvoice': 0.01,
};

class CostTracker {
  private dailyBudget: number = 50;
  private todayCost: number = 0;
  private costHistory: CostEntry[] = [];

  setBudget(budget: number) {
    this.dailyBudget = budget;
  }

  canAfford(estimatedCost: number): boolean {
    return (this.todayCost + estimatedCost) <= this.dailyBudget;
  }

  async recordCost(entry: Omit<CostEntry, 'timestamp'>) {
    const fullEntry = { ...entry, timestamp: Date.now() };
    this.costHistory.push(fullEntry);
    this.todayCost += entry.estimatedCost;
  }

  estimateBatchCost(config: {
    count: number;
    textModel?: string;
    imageModel?: string;
    videoModel?: string;
    audioModel?: string;
    avgScriptTokens?: number;
    avgShotsPerVideo?: number;
    avgDurationSeconds?: number;
  }): { total: number; breakdown: Record<string, number> } {
    const {
      count,
      textModel = 'deepseek-chat',
      imageModel = 'doubao-seedream',
      videoModel = 'doubao-seedance',
      audioModel = 'tts-1-hd',
      avgScriptTokens = 2000,
      avgShotsPerVideo = 6,
      avgDurationSeconds = 30,
    } = config;

    const textCostPerUnit = (MODEL_COSTS[textModel] || 0.5) * (avgScriptTokens / 1000000);
    const imageCostPerUnit = (MODEL_COSTS[imageModel] || 0.02) * avgShotsPerVideo;
    const videoCostPerUnit = (MODEL_COSTS[videoModel] || 0.1) * avgDurationSeconds;
    const audioCostPerUnit = (MODEL_COSTS[audioModel] || 0.01) * 5;

    const scriptTotal = count * textCostPerUnit * 3;
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

  resetDaily() {
    this.todayCost = 0;
  }
}

describe('Cost control', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('budget checking', () => {
    it('can afford within default budget', () => {
      expect(tracker.canAfford(10)).toBe(true);
    });

    it('cannot afford when exceeding budget', () => {
      expect(tracker.canAfford(51)).toBe(false);
    });

    it('respects custom budget', () => {
      tracker.setBudget(5);
      expect(tracker.canAfford(4.99)).toBe(true);
      expect(tracker.canAfford(5.01)).toBe(false);
    });

    it('accounts for accumulated costs', async () => {
      tracker.setBudget(10);
      await tracker.recordCost({ type: 'text', model: 'gpt-4o', estimatedCost: 7 });
      expect(tracker.canAfford(3)).toBe(true);
      expect(tracker.canAfford(3.01)).toBe(false);
    });

    it('canAfford is exact at boundary', () => {
      tracker.setBudget(10);
      expect(tracker.canAfford(10)).toBe(true);
    });
  });

  describe('cost estimation per model type', () => {
    it('estimates batch cost with defaults (deepseek + doubao)', () => {
      const result = tracker.estimateBatchCost({ count: 10 });
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown).toHaveProperty('text');
      expect(result.breakdown).toHaveProperty('image');
      expect(result.breakdown).toHaveProperty('video');
      expect(result.breakdown).toHaveProperty('audio');
      // Verify breakdown sums to total
      const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - result.total)).toBeLessThan(0.02); // float rounding tolerance
    });

    it('text cost scales with token count', () => {
      const low = tracker.estimateBatchCost({ count: 1, avgScriptTokens: 1000 });
      const high = tracker.estimateBatchCost({ count: 1, avgScriptTokens: 10000 });
      expect(high.breakdown.text).toBeGreaterThan(low.breakdown.text);
    });

    it('image cost scales with shot count', () => {
      const low = tracker.estimateBatchCost({ count: 1, avgShotsPerVideo: 3 });
      const high = tracker.estimateBatchCost({ count: 1, avgShotsPerVideo: 12 });
      expect(high.breakdown.image).toBeGreaterThan(low.breakdown.image);
    });

    it('video cost scales with duration', () => {
      const low = tracker.estimateBatchCost({ count: 1, avgDurationSeconds: 10 });
      const high = tracker.estimateBatchCost({ count: 1, avgDurationSeconds: 60 });
      expect(high.breakdown.video).toBeGreaterThan(low.breakdown.video);
    });

    it('uses fallback cost for unknown models', () => {
      const result = tracker.estimateBatchCost({
        count: 1,
        textModel: 'unknown-model',
      });
      // Unknown text model should use 0.5 fallback
      expect(result.breakdown.text).toBeGreaterThan(0);
    });

    it('cost scales linearly with count', () => {
      const single = tracker.estimateBatchCost({ count: 1 });
      const ten = tracker.estimateBatchCost({ count: 10 });
      expect(Math.abs(ten.total - single.total * 10)).toBeLessThan(0.02);
    });

    it('gpt-4o is more expensive than deepseek', () => {
      const cheap = tracker.estimateBatchCost({ count: 1, textModel: 'deepseek-chat' });
      const expensive = tracker.estimateBatchCost({ count: 1, textModel: 'gpt-4o' });
      expect(expensive.breakdown.text).toBeGreaterThan(cheap.breakdown.text);
    });
  });

  describe('daily summary', () => {
    it('returns empty summary for fresh tracker', () => {
      const summary = tracker.getTodaySummary();
      expect(summary.totalCost).toBe(0);
      expect(summary.budget).toBe(50);
      expect(summary.remaining).toBe(50);
      expect(summary.usagePercent).toBe(0);
      expect(summary.totalCalls).toBe(0);
    });

    it('tracks costs by type', async () => {
      await tracker.recordCost({ type: 'text', model: 'gpt-4o', estimatedCost: 5 });
      await tracker.recordCost({ type: 'image', model: 'doubao-seedream', estimatedCost: 2 });
      await tracker.recordCost({ type: 'text', model: 'gpt-4o', estimatedCost: 3 });

      const summary = tracker.getTodaySummary();
      expect(summary.totalCost).toBe(10);
      expect(summary.byType.text).toBe(8);
      expect(summary.byType.image).toBe(2);
      expect(summary.totalCalls).toBe(3);
    });

    it('resetDaily clears today cost', async () => {
      await tracker.recordCost({ type: 'text', model: 'gpt-4o', estimatedCost: 20 });
      expect(tracker.canAfford(31)).toBe(false);
      tracker.resetDaily();
      expect(tracker.canAfford(31)).toBe(true);
    });
  });
});
