import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";
import { voiceQueue } from "../queue/queues";

const connection = createConnection();

const worker = new Worker(
  "video",
  async (job) => {
    const { batchId, projectId, payload } = job.data;
    console.log(`[Video Worker] Processing project ${projectId}`);

    await job.updateProgress(10);
    const u = (await import("../utils")).default;

    const images = await u.db("t_image").where("projectId", projectId).orderBy("shotIndex", "asc").select("filePath", "shotIndex");
    if (images.length === 0) throw new Error("No images found");

    const storyboard = await u.db("t_chatHistory").where({ projectId, type: "storyboard" }).first();
    const shots = storyboard?.data ? JSON.parse(storyboard.data as string) : [];

    const videoConfig = await u.db("t_config").where("type", "video").first();
    if (!videoConfig?.apiKey) throw new Error("未配置视频AI模型");

    const generateVideo = (await import("../utils/ai/generateVideo")).default;
    let generated = 0;

    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i];
        const shotData = shots[image.shotIndex] || {};

        const imageBase64 = await u.oss.getImageBase64(image.filePath);

        const videoUrl = await generateVideo(
          { ...videoConfig, filePath: image.filePath, prompt: shotData.description || "", duration: shotData.duration || 5, mode: "single", imageBase64 } as any,
          videoConfig.manufacturer as string
        );

        await u.db("t_video").insert({
          projectId,
          filePath: videoUrl,
          prompt: shotData.description || "",
          state: 1,
          time: shotData.duration || 5,
          createdAt: Date.now(),
        } as any).catch((err: any) => { console.error("[background]", err.message); });

        generated++;
        await job.updateProgress(10 + Math.round((i / images.length) * 80));
      } catch (err: any) {
        console.error(`[Video Worker] Image ${i} failed:`, err.message);
      }
    }

    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "video" })
      .update({ status: "success", result: JSON.stringify({ generated, total: images.length }), completedAt: Date.now() });

    // Chain: voice
    await voiceQueue.add("voice", { batchId, projectId, step: "voice", payload });

    await job.updateProgress(100);
    console.log(`[Video Worker] Project ${projectId}: ${generated}/${images.length} videos`);
    return { projectId, generated, total: images.length };
  },
  { connection, concurrency: 2 } // GPU-intensive, low concurrency
);

worker.on("failed", (job, err) => {
  console.error(`[Video Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Video Worker] Started, waiting for jobs...");
