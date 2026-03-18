import batchEngine from "./batchEngine";
import { scoreProject } from "./scoringEngine";
import evolutionEngine from "./evolutionEngine";
import u from "@/utils";

interface ScheduleConfig {
  dailyBatchCount: number;       // videos per day
  batchSize: number;             // videos per batch
  defaultType: string;           // default content type
  defaultStyle: string;          // default style
  scoreThreshold: number;        // minimum score to keep
  evolutionEnabled: boolean;     // auto-evolve after scoring
  publishEnabled: boolean;       // auto-publish high scores
}

const DEFAULT_CONFIG: ScheduleConfig = {
  dailyBatchCount: 50,
  batchSize: 10,
  defaultType: "short_drama",
  defaultStyle: "shuangwen",
  scoreThreshold: 6.0,
  evolutionEnabled: true,
  publishEnabled: false,  // disabled by default for safety
};

class ProductionScheduler {
  private config: ScheduleConfig = DEFAULT_CONFIG;
  private timers: ReturnType<typeof setInterval>[] = [];
  private isRunning: boolean = false;

  // Update config
  setConfig(config: Partial<ScheduleConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  // Run one complete production cycle
  async runProductionCycle(): Promise<{
    batchId: string;
    generated: number;
    scored: number;
    passed: number;
    failed: number;
    evolved: boolean;
  }> {
    console.log("[Scheduler] Starting production cycle...");

    // Step 1: Create batch
    const batch = await batchEngine.createBatch({
      type: this.config.defaultType,
      count: this.config.batchSize,
      style: this.config.defaultStyle,
      priority: "normal",
    });

    console.log(`[Scheduler] Batch ${batch.batchId} created with ${batch.totalTasks} tasks`);

    // Step 2: Wait for batch to complete (poll every 10s, max 30min)
    let batchDone = false;
    const maxWait = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    while (!batchDone && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      const status = await batchEngine.getBatchStatus(batch.batchId);
      if (status && (status.status === "completed" || status.status === "failed")) {
        batchDone = true;
      }
    }

    // Step 3: Score all generated projects
    let scored = 0;
    let passed = 0;
    let failed = 0;

    for (const projectId of batch.projectIds) {
      try {
        const score = await scoreProject(projectId);
        scored++;

        if (score.finalScore >= this.config.scoreThreshold) {
          passed++;
          // Mark project as publishable
          await u.db("t_project").where("id", projectId).update({
            status: "ready",
          } as any);
        } else {
          failed++;
          await u.db("t_project").where("id", projectId).update({
            status: "rejected",
          } as any);
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to score project ${projectId}:`, err);
        failed++;
      }
    }

    // Step 4: Evolve prompts if enabled
    let evolved = false;
    if (this.config.evolutionEnabled) {
      try {
        // Load current population
        const promptRows = await u.db("t_prompts")
          .where("type", "evolved")
          .select("defaultValue");

        const population = promptRows
          .map((r: any) => { try { return JSON.parse(r.defaultValue); } catch { return null; } })
          .filter(Boolean);

        if (population.length >= 10) {
          const nextGen = await evolutionEngine.evolve(population);
          // Save new generation
          await u.db("t_prompts").where("type", "evolved").delete();
          for (const genome of nextGen) {
            await u.db("t_prompts").insert({
              code: `evolved_${genome.id}`,
              name: `进化Prompt-G${genome.generation}`,
              type: "evolved",
              parentCode: null,
              defaultValue: JSON.stringify(genome),
              customValue: null,
            }).catch(() => {});
          }
          evolved = true;
        }
      } catch (err) {
        console.error("[Scheduler] Evolution failed:", err);
      }
    }

    console.log(`[Scheduler] Cycle complete: ${scored} scored, ${passed} passed, ${failed} failed, evolved=${evolved}`);

    return {
      batchId: batch.batchId,
      generated: batch.projectIds.length,
      scored,
      passed,
      failed,
      evolved,
    };
  }

  // Start automated production (runs every N hours)
  start(intervalHours: number = 6) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[Scheduler] Started. Running every ${intervalHours} hours.`);

    // Run immediately
    this.runProductionCycle().catch(err => console.error("[Scheduler] Cycle error:", err));

    // Schedule recurring
    const timer = setInterval(() => {
      this.runProductionCycle().catch(err => console.error("[Scheduler] Cycle error:", err));
    }, intervalHours * 60 * 60 * 1000);

    this.timers.push(timer);
  }

  // Stop automated production
  stop() {
    this.isRunning = false;
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    console.log("[Scheduler] Stopped.");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}

const scheduler = new ProductionScheduler();
export default scheduler;
