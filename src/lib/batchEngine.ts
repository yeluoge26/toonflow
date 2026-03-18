import u from "@/utils";
import { v4 as uuid } from "uuid";

interface BatchConfig {
  type: string;
  count: number;
  priority?: "high" | "normal" | "low";
  template?: string;
  style?: string;
  variables?: Record<string, any>;
  duration?: number;
  artStyle?: string;
}

interface BatchResult {
  batchId: string;
  totalTasks: number;
  projectIds: number[];
}

class BatchEngine {
  // Create a batch of video production tasks
  async createBatch(config: BatchConfig): Promise<BatchResult> {
    const batchId = `batch_${uuid().slice(0, 8)}`;

    // Insert batch record
    await u.db("t_batch").insert({
      batchId,
      type: config.type,
      totalCount: config.count,
      priority: config.priority || "normal",
      status: "pending",
      config: JSON.stringify(config),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const projectIds: number[] = [];

    // Create projects and pipeline tasks for each video
    for (let i = 0; i < config.count; i++) {
      // Create project
      const [projectId] = await u.db("t_project").insert({
        name: `${config.type}_${batchId}_${i + 1}`,
        intro: `Batch generated: ${config.type}`,
        type: config.type,
        artStyle: config.artStyle || "",
        videoRatio: "9:16",
        createTime: Date.now(),
        userId: 1,
      });
      projectIds.push(projectId);

      // Create pipeline: script -> storyboard -> image -> video -> voice -> score
      const steps = ["script", "storyboard", "image", "video", "voice", "score"];
      for (const step of steps) {
        const taskId = `${batchId}_${projectId}_${step}`;
        await u.db("t_pipelineTask").insert({
          taskId,
          batchId,
          projectId,
          step,
          status: step === "script" ? "pending" : "waiting",
          priority: config.priority === "high" ? 10 : config.priority === "low" ? 1 : 5,
          payload: JSON.stringify({
            ...config.variables,
            style: config.style,
            duration: config.duration,
            stepIndex: steps.indexOf(step),
          }),
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        });
      }
    }

    // Update batch status
    await u.db("t_batch").where("batchId", batchId).update({
      status: "running",
      updatedAt: Date.now(),
    });

    // Start processing
    this.processNext(batchId);

    return { batchId, totalTasks: config.count * 6, projectIds };
  }

  // Process next available task in a batch
  async processNext(batchId?: string) {
    // Find next pending task
    let query = u.db("t_pipelineTask").where("status", "pending").orderBy("priority", "desc").orderBy("createdAt", "asc");

    if (batchId) query = query.where("batchId", batchId);

    const task = await query.first();
    if (!task) return;

    // Mark as running
    await u.db("t_pipelineTask").where("id", task.id).update({
      status: "running",
      startedAt: Date.now(),
    });

    try {
      const payload = JSON.parse(task.payload || "{}");
      const result = await this.executeStep(task.step, task.projectId, payload);

      // Mark success
      await u.db("t_pipelineTask").where("id", task.id).update({
        status: "success",
        result: JSON.stringify(result),
        completedAt: Date.now(),
      });

      // Unlock next step
      await this.unlockNextStep(task.batchId, task.projectId, task.step);

      // Update batch counters
      await this.updateBatchProgress(task.batchId);
    } catch (err: any) {
      const retryCount = (task.retryCount || 0) + 1;

      if (retryCount < (task.maxRetries || 3)) {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        await u.db("t_pipelineTask").where("id", task.id).update({
          status: "pending",
          retryCount,
          errorMsg: err.message,
        });
        setTimeout(() => this.processNext(batchId), delay);
      } else {
        // Final failure
        await u.db("t_pipelineTask").where("id", task.id).update({
          status: "failed",
          retryCount,
          errorMsg: err.message,
          completedAt: Date.now(),
        });

        // Update batch fail count
        await u.db("t_batch").where("batchId", task.batchId).increment("failCount", 1);
      }
    }

    // Continue processing
    setTimeout(() => this.processNext(batchId), 100);
  }

  // Execute a specific pipeline step
  private async executeStep(step: string, projectId: number, payload: any): Promise<any> {
    switch (step) {
      case "script":
        return { status: "script_generated", projectId };
        // TODO: Wire to actual generateScript function
      case "storyboard":
        return { status: "storyboard_generated", projectId };
        // TODO: Wire to storyboard agent
      case "image":
        return { status: "images_generated", projectId };
        // TODO: Wire to image generation
      case "video":
        return { status: "video_generated", projectId };
        // TODO: Wire to video generation
      case "voice":
        return { status: "voice_generated", projectId };
        // TODO: Wire to TTS
      case "score":
        return { status: "scored", projectId };
        // TODO: Wire to scoring system
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }

  // Unlock the next step in pipeline after current completes
  private async unlockNextStep(batchId: string, projectId: number, currentStep: string) {
    const stepOrder = ["script", "storyboard", "image", "video", "voice", "score"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      await u.db("t_pipelineTask").where("batchId", batchId).where("projectId", projectId).where("step", nextStep).update({ status: "pending" });
    }
  }

  // Update batch progress
  private async updateBatchProgress(batchId: string) {
    const stats = await u
      .db("t_pipelineTask")
      .where("batchId", batchId)
      .where("step", "score")
      .select(
        u.db.raw("SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount"),
        u.db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failCount")
      )
      .first();

    const batch = await u.db("t_batch").where("batchId", batchId).first();
    if (!batch) return;

    const updates: any = {
      successCount: Number(stats?.successCount || 0),
      failCount: Number(stats?.failCount || 0),
      updatedAt: Date.now(),
    };

    if (updates.successCount + updates.failCount >= batch.totalCount) {
      updates.status = updates.failCount === batch.totalCount ? "failed" : "completed";
    }

    await u.db("t_batch").where("batchId", batchId).update(updates);
  }

  // Get batch status
  async getBatchStatus(batchId: string) {
    const batch = await u.db("t_batch").where("batchId", batchId).first();
    if (!batch) return null;

    const tasks = await u.db("t_pipelineTask").where("batchId", batchId).select("step", "status", "projectId", "errorMsg");

    const stepStats: Record<string, { pending: number; running: number; success: number; failed: number }> = {};
    for (const task of tasks) {
      if (!stepStats[task.step]) {
        stepStats[task.step] = { pending: 0, running: 0, success: 0, failed: 0 };
      }
      const statusKey = task.status as keyof (typeof stepStats)[string];
      if (statusKey in (stepStats[task.step] || {})) {
        stepStats[task.step][statusKey]++;
      }
    }

    return {
      ...batch,
      config: JSON.parse(batch.config || "{}"),
      stepStats,
      progress: Math.round((batch.successCount / batch.totalCount) * 100),
    };
  }
}

const batchEngine = new BatchEngine();
export default batchEngine;
