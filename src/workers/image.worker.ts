import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";
import { videoQueue } from "../queue/queues";

const connection = createConnection();

const worker = new Worker(
  "image",
  async (job) => {
    const { batchId, projectId, payload } = job.data;
    console.log(`[Image Worker] Processing project ${projectId}`);

    await job.updateProgress(10);
    const u = (await import("../utils")).default;

    const storyboard = await u.db("t_chatHistory").where({ projectId, type: "storyboard" }).first();
    if (!storyboard?.data) throw new Error("No storyboard data");

    const shots = JSON.parse(storyboard.data as string);
    const project = await u.db("t_project").where("id", projectId).first();

    const imageConfig = await u.getPromptAi("storyboardImage") as any;
    if (!imageConfig?.apiKey) throw new Error("未配置图片AI模型");

    const generateImage = (await import("../utils/ai/image")).default;
    let generated = 0;

    for (let i = 0; i < shots.length; i++) {
      try {
        const shot = shots[i];
        const imagePrompt = `${shot.description}, ${project?.artStyle || "cinematic"}, 8k, ultra HD, high detail`;

        const imageUrl = await generateImage(
          { prompt: imagePrompt, aspectRatio: project?.videoRatio || "16:9" } as any,
          imageConfig
        );

        await u.db("t_image").insert({
          projectId,
          filePath: imageUrl,
          shotIndex: i,
          createdAt: Date.now(),
        } as any).catch((err: any) => { console.error("[background]", err.message); });

        generated++;
        await job.updateProgress(10 + Math.round((i / shots.length) * 80));
      } catch (err: any) {
        console.error(`[Image Worker] Shot ${i} failed:`, err.message);
      }
    }

    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "image" })
      .update({ status: "success", result: JSON.stringify({ generated, total: shots.length }), completedAt: Date.now() });

    // Chain: video
    await videoQueue.add("video", {
      batchId,
      projectId,
      step: "video",
      payload: { ...payload, imageCount: generated },
    });

    await job.updateProgress(100);
    console.log(`[Image Worker] Project ${projectId}: ${generated}/${shots.length} images`);
    return { projectId, generated, total: shots.length };
  },
  { connection, concurrency: 3 } // Lower concurrency for GPU-intensive work
);

worker.on("failed", (job, err) => {
  console.error(`[Image Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Image Worker] Started, waiting for jobs...");
