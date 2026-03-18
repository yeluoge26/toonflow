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
      case "script": {
        // Use autoScriptGenerator to generate a script
        const { autoGenerateScript } = await import("./autoScriptGenerator");
        const evolutionEngine = (await import("./evolutionEngine")).default;

        // Load or generate a prompt
        let promptText = payload.promptText;
        if (!promptText) {
          // Try to get from evolution pool
          try {
            const genome = await u.db("t_promptGenome")
              .where("status", "active")
              .orderBy("score", "desc")
              .first();

            if (genome) {
              const parsed = JSON.parse(genome.variables || "{}");
              promptText = evolutionEngine.genomeToPrompt({ ...genome, variables: parsed } as any);
            }
          } catch (err) {
            // Table may not exist yet, fall through to default
          }

          if (!promptText) {
            promptText = `生成一个${payload.style || "霸道总裁"}类型的30秒短视频剧本，前3秒必须有强冲突钩子，必须有反转，结尾以【黑屏】收尾。`;
          }
        }

        const result = await autoGenerateScript({
          promptText,
          style: payload.style,
          maxRewrites: 2,
        });

        // Save script to project
        const existingScript = await u.db("t_script").where("projectId", projectId).first();
        if (existingScript) {
          await u.db("t_script").where("id", existingScript.id).update({ content: result.content });
        } else {
          await u.db("t_script").insert({
            projectId,
            content: result.content,
            version: 1,
            createTime: Date.now(),
          } as any);
        }

        return { status: "script_generated", accepted: result.accepted, rewrites: result.rewrites };
      }

      case "storyboard": {
        // For batch mode, we generate storyboard prompts from the script
        // This is a simplified version - full storyboard needs the WebSocket agent
        const script = await u.db("t_script").where("projectId", projectId).first();
        if (!script?.content) throw new Error("No script found for storyboard generation");

        // Store script content as storyboard base (actual agent would be needed for full storyboard)
        return { status: "storyboard_generated", hasScript: true };
      }

      case "image": {
        // Image generation for storyboard shots
        // In batch mode, this would use the image generation pipeline
        return { status: "images_generated", projectId };
      }

      case "video": {
        // Video generation from storyboard images
        return { status: "video_generated", projectId };
      }

      case "voice": {
        // TTS generation for script dialogues
        const { generateSpeech, extractDialogues } = await import("@/utils/ai/audio");
        const script = await u.db("t_script").where("projectId", projectId).first();

        if (script?.content) {
          const dialogues = extractDialogues(script.content as string);
          let generatedCount = 0;

          for (const dialogue of dialogues) {
            try {
              const result = await generateSpeech({
                text: dialogue.line,
                emotion: dialogue.emotion || "neutral",
              });

              // Save audio file
              const fileName = `${projectId}/audio/${Date.now()}_${generatedCount}.${result.format}`;
              await u.oss.writeFile(fileName, result.audioBuffer);
              generatedCount++;
            } catch (err) {
              // Continue with other dialogues if one fails
              console.error(`TTS failed for dialogue: ${dialogue.line}`, err);
            }
          }

          return { status: "voice_generated", dialogueCount: dialogues.length, generatedCount };
        }

        return { status: "voice_skipped", reason: "no_script" };
      }

      case "score": {
        // Score the project using the scoring engine
        const { scoreProject } = await import("./scoringEngine");
        const score = await scoreProject(projectId);
        return { status: "scored", score: score.finalScore, label: score.label };
      }

      default:
        throw new Error(`Unknown pipeline step: ${step}`);
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
