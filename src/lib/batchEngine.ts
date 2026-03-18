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
        const script = await u.db("t_script").where("projectId", projectId).first();
        if (!script?.content) throw new Error("无剧本内容，无法生成分镜");

        // Use AI to split script into shots (simplified batch mode, no WebSocket agent needed)
        const promptAi = await u.getPromptAi("storyboardAgent") as any;
        if (!promptAi?.apiKey) throw new Error("未配置分镜AI模型");

        const shotPrompt = `将以下剧本拆分为6-10个分镜镜头。每个镜头包含：描述（一句话画面描述）和时长（秒数）。

输出JSON数组格式：
[{"description":"镜头画面描述","duration":3},...]

剧本内容：
${(script.content as string).slice(0, 3000)}`;

        const result = await u.ai.text.invoke(
          { system: "你是专业分镜师，将剧本拆分为短视频分镜。只输出JSON数组，不要其他内容。", prompt: shotPrompt },
          promptAi
        );

        // Parse shots from AI response
        let shots: Array<{ description: string; duration: number }> = [];
        try {
          const text = result?.text || String(result);
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            shots = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Fallback: split script into paragraphs as shots
          const paragraphs = (script.content as string).split("\n").filter((l: string) => l.trim().length > 10);
          shots = paragraphs.slice(0, 8).map((p: string) => ({ description: p.slice(0, 100), duration: 3 }));
        }

        if (shots.length === 0) {
          // Final fallback if AI returned nothing parseable
          const paragraphs = (script.content as string).split("\n").filter((l: string) => l.trim().length > 10);
          shots = paragraphs.slice(0, 8).map((p: string) => ({ description: p.slice(0, 100), duration: 3 }));
        }

        // Save shots as storyboard data in t_chatHistory
        const storyboardData = JSON.stringify(shots.map((s, i) => ({
          index: i,
          title: `镜头${i + 1}`,
          description: s.description,
          duration: s.duration,
        })));

        await u.db("t_chatHistory").insert({
          projectId,
          type: "storyboard",
          data: storyboardData,
          createdAt: Date.now(),
        } as any).catch(async () => {
          // Update if exists
          await u.db("t_chatHistory").where({ projectId, type: "storyboard" }).update({
            data: storyboardData,
          });
        });

        return { status: "storyboard_generated", shotCount: shots.length, shots };
      }

      case "image": {
        // Load storyboard data
        const storyboard = await u.db("t_chatHistory")
          .where({ projectId, type: "storyboard" })
          .first();

        if (!storyboard?.data) throw new Error("无分镜数据，无法生成图片");

        const shots = JSON.parse(storyboard.data as string);
        const project = await u.db("t_project").where("id", projectId).first();

        // Get image AI config
        const imageConfig = await u.getPromptAi("storyboardImage") as any;
        if (!imageConfig?.apiKey) throw new Error("未配置图片生成AI模型");

        const generatedImages: string[] = [];

        for (const shot of shots) {
          try {
            // Build image prompt
            const imagePrompt = `${shot.description}, ${project?.artStyle || "cinematic"}, 8k, ultra HD, high detail`;

            const generateImage = (await import("@/utils/ai/image")).default;
            const imageUrl = await generateImage(
              {
                prompt: imagePrompt,
                aspectRatio: project?.videoRatio || "16:9",
                size: "2K" as const,
                imageBase64: [],
                resType: "url" as const,
                taskClass: "batch_storyboard",
                name: `镜头${shot.index ?? shots.indexOf(shot)}`,
                describe: shot.description,
                projectId,
              },
              imageConfig
            );

            generatedImages.push(imageUrl);

            // Save image record
            await u.db("t_image").insert({
              projectId,
              filePath: imageUrl,
              shotIndex: shots.indexOf(shot),
              createdAt: Date.now(),
            } as any).catch(() => {});
          } catch (err) {
            console.error(`[BatchEngine] Image generation failed for shot ${shots.indexOf(shot)}:`, err);
            // Continue with other shots
          }
        }

        return { status: "images_generated", total: shots.length, generated: generatedImages.length };
      }

      case "video": {
        // Load generated images
        const images = await u.db("t_image")
          .where("projectId", projectId)
          .orderBy("shotIndex", "asc")
          .select("filePath", "shotIndex");

        if (images.length === 0) throw new Error("无图片素材，无法生成视频");

        // Load storyboard for prompts and durations
        const videoStoryboard = await u.db("t_chatHistory")
          .where({ projectId, type: "storyboard" })
          .first();
        const videoShots = videoStoryboard?.data ? JSON.parse(videoStoryboard.data as string) : [];

        const videoProject = await u.db("t_project").where("id", projectId).first();

        let generatedCount = 0;

        for (const image of images) {
          try {
            const shotData = videoShots[image.shotIndex] || {};
            const videoPrompt = shotData.description || "";
            const duration = shotData.duration || 5;

            // Get image as base64 for video generation
            let imageBase64 = "";
            try {
              imageBase64 = await u.oss.getImageBase64(image.filePath);
            } catch {
              continue; // Skip if image not loadable
            }

            const savePath = `${projectId}/video/${Date.now()}_shot${image.shotIndex}.mp4`;

            const generateVideo = (await import("@/utils/ai/generateVideo")).default;
            const videoUrl = await generateVideo(
              {
                prompt: videoPrompt,
                savePath,
                imageBase64: [imageBase64],
                duration,
                aspectRatio: videoProject?.videoRatio || "9:16",
              } as any,
              "volcengine"
            );

            // Save video record
            await u.db("t_video").insert({
              projectId,
              filePath: videoUrl || savePath,
              prompt: videoPrompt,
              state: 1,
              time: duration,
              createdAt: Date.now(),
            } as any).catch(() => {});

            generatedCount++;
          } catch (err) {
            console.error(`[BatchEngine] Video generation failed for image ${image.shotIndex}:`, err);
          }
        }

        return { status: "video_generated", total: images.length, generated: generatedCount };
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
