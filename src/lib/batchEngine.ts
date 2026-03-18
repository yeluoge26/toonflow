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
  queued: boolean;
}

class BatchEngine {
  // Create a batch - creates projects and submits to BullMQ
  async createBatch(config: BatchConfig): Promise<BatchResult> {
    const batchId = `batch_${uuid().slice(0, 8)}`;
    const priorityMap = { high: 1, normal: 5, low: 10 };
    const priority = priorityMap[config.priority || "normal"];

    // Insert batch record
    await u.db("t_batch").insert({
      batchId,
      type: config.type,
      totalCount: config.count,
      priority: config.priority || "normal",
      status: "running",
      config: JSON.stringify(config),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const projectIds: number[] = [];
    let queued = false;

    for (let i = 0; i < config.count; i++) {
      // Create project
      const [projectId] = await u.db("t_project").insert({
        name: `${config.type}_${batchId}_${i + 1}`,
        intro: `Batch: ${config.type}`,
        type: config.type,
        artStyle: config.artStyle || "",
        videoRatio: "9:16",
        createTime: Date.now(),
        userId: 1,
      });
      projectIds.push(projectId);

      // Create pipeline task records for tracking
      const steps = ["script", "storyboard", "image", "video", "voice", "score"];
      for (const step of steps) {
        await u.db("t_pipelineTask").insert({
          taskId: `${batchId}_${projectId}_${step}`,
          batchId,
          projectId,
          step,
          status: step === "script" ? "pending" : "waiting",
          priority: priority,
          payload: JSON.stringify(config.variables || {}),
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        });
      }

      // Submit to BullMQ (only script step - workers chain the rest)
      try {
        const { QueueService } = await import("@/services/queue.service");
        await QueueService.addPipeline(batchId, projectId, {
          ...config.variables,
          style: config.style,
          duration: config.duration,
          artStyle: config.artStyle,
        }, priority);
        queued = true;
      } catch (err: any) {
        // BullMQ/Redis not available - fall back to direct processing
        console.warn(`[BatchEngine] BullMQ unavailable, using fallback: ${err.message}`);
        queued = false;
        // Mark as pending for the old SQLite-based processor
        await u.db("t_pipelineTask")
          .where({ batchId, projectId, step: "script" })
          .update({ status: "pending" });
      }
    }

    // If BullMQ is not available, start the fallback processor
    if (!queued) {
      this.processFallback(batchId);
    }

    return { batchId, totalTasks: config.count * 6, projectIds, queued };
  }

  // Fallback: SQLite-based processing when Redis is not available
  private async processFallback(batchId: string) {
    const task = await u.db("t_pipelineTask")
      .where("batchId", batchId)
      .where("status", "pending")
      .orderBy("createdAt", "asc")
      .first();

    if (!task) return;

    await u.db("t_pipelineTask").where("id", task.id).update({ status: "running", startedAt: Date.now() });

    try {
      const result = await this.executeStepFallback(task.step, task.projectId, JSON.parse(task.payload || "{}"), batchId);
      await u.db("t_pipelineTask").where("id", task.id).update({
        status: "success",
        result: JSON.stringify(result),
        completedAt: Date.now(),
      });

      // Unlock next step
      const stepOrder = ["script", "storyboard", "image", "video", "voice", "score"];
      const nextIndex = stepOrder.indexOf(task.step) + 1;
      if (nextIndex < stepOrder.length) {
        await u.db("t_pipelineTask")
          .where({ batchId, projectId: task.projectId, step: stepOrder[nextIndex] })
          .update({ status: "pending" });
      }

      // Update batch
      if (task.step === "score") {
        await u.db("t_batch").where("batchId", batchId).increment("successCount", 1).update({ updatedAt: Date.now() });
      }
    } catch (err: any) {
      const retries = (task.retryCount || 0) + 1;
      if (retries < 3) {
        await u.db("t_pipelineTask").where("id", task.id).update({
          status: "pending",
          retryCount: retries,
          errorMsg: err.message,
        });
      } else {
        await u.db("t_pipelineTask").where("id", task.id).update({
          status: "failed",
          retryCount: retries,
          errorMsg: err.message,
          completedAt: Date.now(),
        });
        await u.db("t_batch").where("batchId", batchId).increment("failCount", 1);
      }
    }

    // Continue processing
    setTimeout(() => this.processFallback(batchId), 500);
  }

  // Fallback step execution (same as before but simplified)
  private async executeStepFallback(step: string, projectId: number, payload: any, batchId: string): Promise<any> {
    switch (step) {
      case "script": {
        const { autoGenerateScript } = await import("./autoScriptGenerator");
        const promptText = payload.promptText || `生成一个${payload.style || "霸道总裁"}类型的30秒短视频剧本，前3秒必须有强冲突，必须有反转，以【黑屏】结尾。`;
        const result = await autoGenerateScript({ promptText, style: payload.style, maxRewrites: 2 });

        const existing = await u.db("t_script").where("projectId", projectId).first();
        if (existing) {
          await u.db("t_script").where("id", existing.id).update({ content: result.content });
        } else {
          await u.db("t_script").insert({ projectId, content: result.content, version: 1, createTime: Date.now() } as any);
        }
        return { accepted: result.accepted };
      }
      case "voice": {
        const { generateSpeech, extractDialogues } = await import("@/utils/ai/audio");
        const script = await u.db("t_script").where("projectId", projectId).first();
        if (!script?.content) return { generated: 0 };
        const dialogues = extractDialogues(script.content as string);
        let generated = 0;
        for (const d of dialogues) {
          try {
            const r = await generateSpeech({ text: d.line, emotion: d.emotion || "neutral" });
            await u.oss.writeFile(`${projectId}/audio/${Date.now()}_${generated}.${r.format}`, r.audioBuffer);
            generated++;
          } catch {}
        }
        return { generated };
      }
      case "score": {
        const { scoreProject } = await import("./scoringEngine");
        return await scoreProject(projectId);
      }
      default:
        return { status: `${step}_skipped_fallback` };
    }
  }

  // Get batch status (works with both BullMQ and fallback)
  async getBatchStatus(batchId: string) {
    const batch = await u.db("t_batch").where("batchId", batchId).first();
    if (!batch) return null;

    const tasks = await u.db("t_pipelineTask").where("batchId", batchId).select("step", "status", "projectId", "errorMsg");

    const stepStats: Record<string, Record<string, number>> = {};
    for (const task of tasks) {
      if (!stepStats[task.step]) stepStats[task.step] = { pending: 0, waiting: 0, running: 0, success: 0, failed: 0 };
      const status = task.status as string;
      if (stepStats[task.step][status] !== undefined) stepStats[task.step][status]++;
    }

    // Also try BullMQ stats
    let queueStats = null;
    try {
      const { QueueService } = await import("@/services/queue.service");
      queueStats = await QueueService.getQueueStats();
    } catch {}

    return {
      ...batch,
      config: batch.config ? JSON.parse(batch.config as string) : {},
      stepStats,
      queueStats,
      progress: batch.totalCount ? Math.round((batch.successCount / batch.totalCount) * 100) : 0,
    };
  }
}

const batchEngine = new BatchEngine();
export default batchEngine;
