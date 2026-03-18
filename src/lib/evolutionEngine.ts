import u from "@/utils";
import { v4 as uuid } from "uuid";

// ==================== Types ====================

export interface PromptGenome {
  id: string;
  generation: number;
  variables: Record<string, string>;
  score: number;
  performanceScore: number;  // real-world data
  parentIds: string[];       // for tracking lineage
  createdAt: number;
}

export interface VariablePool {
  genre: string[];
  hook: string[];
  theme: string[];
  twist: string[];
  ending: string[];
  emotion: string[];
  duration: number[];
}

// ==================== Default Variable Pool ====================

export const DEFAULT_VARIABLE_POOL: VariablePool = {
  genre: [
    "霸道总裁", "情感虐心", "悬疑反转", "校园恋爱",
    "AI恋人", "复仇爽文", "重生逆袭", "甜宠日常",
    "职场逆袭", "豪门恩怨", "古风虐恋", "都市奇遇",
  ],
  hook: [
    "被全公司羞辱的她", "突然收到死人的消息",
    "手机预测了自己的死亡", "醒来发现自己变成了AI",
    "前任突然跪下求复合", "被甩后彩票中了500万",
    "面试官竟然是前男友", "收到来自未来的视频",
    "深夜收到陌生人的求救", "发现老公是AI",
    "婚礼上新郎逃跑", "重生回到被背叛那天",
  ],
  theme: [
    "被背叛的爱情", "隐藏身份", "假结婚",
    "失忆", "重生", "AI替代人类",
    "时间循环", "平行世界", "命运交换",
    "末日恋人", "跨越时空的信",
  ],
  twist: [
    "她其实是董事长女儿", "AI回复了消息",
    "凶手竟然是自己", "前男友破产来求她",
    "他一直在暗中保护她", "一切都是梦境",
    "真正的反派是最信任的人", "时间倒流只有她知道",
    "死去的人还活着", "她是最后一个人类",
  ],
  ending: [
    "崩溃大哭", "冷笑转身", "深情拥抱",
    "绝望独白", "震惊真相", "释然微笑",
    "悬念未解", "反转再反转", "黑屏留白",
  ],
  emotion: [
    "虐心", "爽快", "温暖", "恐惧",
    "震惊", "感动", "愤怒", "释然",
  ],
  duration: [15, 30, 45, 60],
};

// ==================== Core Functions ====================

class EvolutionEngine {
  private variablePool: VariablePool = DEFAULT_VARIABLE_POOL;

  // Set custom variable pool
  setVariablePool(pool: Partial<VariablePool>) {
    this.variablePool = { ...this.variablePool, ...pool };
  }

  // Generate initial population
  async generateInitialPopulation(count: number): Promise<PromptGenome[]> {
    const population: PromptGenome[] = [];

    for (let i = 0; i < count; i++) {
      const genome = this.randomGenome();
      population.push(genome);

      // Save to database
      await u.db("t_prompts").insert({
        code: `evolved_${genome.id}`,
        name: `进化Prompt-G${genome.generation}`,
        type: "evolved",
        parentCode: null,
        defaultValue: JSON.stringify(genome),
        customValue: null,
      }).catch(() => {}); // Ignore if exists
    }

    return population;
  }

  // Create a random genome
  private randomGenome(): PromptGenome {
    const pool = this.variablePool;
    return {
      id: uuid().slice(0, 8),
      generation: 1,
      variables: {
        genre: this.randomPick(pool.genre),
        hook: this.randomPick(pool.hook),
        theme: this.randomPick(pool.theme),
        twist: this.randomPick(pool.twist),
        ending: this.randomPick(pool.ending),
        emotion: this.randomPick(pool.emotion),
        duration: String(this.randomPick(pool.duration)),
      },
      score: 0,
      performanceScore: 0,
      parentIds: [],
      createdAt: Date.now(),
    };
  }

  // Selection: pick top performers
  select(population: PromptGenome[], ratio: number = 0.2): PromptGenome[] {
    // Combined score: 60% AI score + 40% real performance
    const scored = population.map(g => ({
      ...g,
      combinedScore: g.score * 0.6 + g.performanceScore * 0.4,
    }));

    return scored
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, Math.max(2, Math.floor(population.length * ratio)));
  }

  // Mutation: randomly change one variable
  mutate(genome: PromptGenome): PromptGenome {
    const pool = this.variablePool;
    const keys = Object.keys(genome.variables);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const options = (pool as any)[randomKey];

    if (!options || options.length === 0) return { ...genome };

    const newValue = String(this.randomPick(options));

    return {
      ...genome,
      id: uuid().slice(0, 8),
      generation: genome.generation + 1,
      variables: { ...genome.variables, [randomKey]: newValue },
      score: 0,
      performanceScore: 0,
      parentIds: [genome.id],
      createdAt: Date.now(),
    };
  }

  // Crossover: combine two genomes
  crossover(parent1: PromptGenome, parent2: PromptGenome): PromptGenome {
    const newVars: Record<string, string> = {};

    for (const key of Object.keys(parent1.variables)) {
      newVars[key] = Math.random() > 0.5
        ? parent1.variables[key]
        : parent2.variables[key];
    }

    return {
      id: uuid().slice(0, 8),
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      variables: newVars,
      score: 0,
      performanceScore: 0,
      parentIds: [parent1.id, parent2.id],
      createdAt: Date.now(),
    };
  }

  // Run one evolution cycle
  async evolve(population: PromptGenome[], mutationRate: number = 0.3): Promise<PromptGenome[]> {
    // Select top performers
    const elites = this.select(population);
    const nextGeneration: PromptGenome[] = [];

    // Keep elites
    nextGeneration.push(...elites);

    // Fill rest with crossover + mutation
    while (nextGeneration.length < population.length) {
      const p1 = elites[Math.floor(Math.random() * elites.length)];
      const p2 = elites[Math.floor(Math.random() * elites.length)];

      let child = this.crossover(p1, p2);

      // Apply mutation with probability
      if (Math.random() < mutationRate) {
        child = this.mutate(child);
      }

      nextGeneration.push(child);
    }

    return nextGeneration;
  }

  // Convert genome to actual script prompt
  genomeToPrompt(genome: PromptGenome): string {
    const v = genome.variables;
    return `你是一个短视频编剧。

目标：
生成一个【${v.genre}】类型的短视频剧本（时长${v.duration}秒）

核心要求：
1. 前3秒必须有强钩子：「${v.hook}」
2. 主题围绕：${v.theme}
3. 必须有反转：${v.twist}
4. 结尾情绪：${v.ending}
5. 整体情感基调：${v.emotion}

结构要求：
- 开头（前3秒）：强冲突或悬念，立刻抓住注意力
- 中段：剧情升级，情绪递进
- 结尾：反转 + 强情绪收尾

输出格式：
直接输出剧本内容，包含场景描述和角色对白。以【黑屏】结尾。`;
  }

  // Utility
  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

const evolutionEngine = new EvolutionEngine();
export default evolutionEngine;
