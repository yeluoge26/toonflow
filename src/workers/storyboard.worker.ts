import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";
import { imageQueue } from "../queue/queues";

const connection = createConnection();

const worker = new Worker(
  "storyboard",
  async (job) => {
    const { batchId, projectId, payload } = job.data;
    console.log(`[Storyboard Worker] Processing project ${projectId}`);

    await job.updateProgress(10);
    const u = (await import("../utils")).default;

    const script = await u.db("t_script").where("projectId", projectId).first();
    if (!script?.content) throw new Error("No script found");

    await job.updateProgress(20);

    // Use AI to split into shots
    const promptAi = await u.getPromptAi("storyboardAgent") as any;
    if (!promptAi?.apiKey) throw new Error("未配置分镜AI模型");

    const result = await u.ai.text.invoke(
      {
        system: "你是专业分镜师。将剧本拆分为6-10个分镜镜头。输出JSON数组：[{\"description\":\"画面描述\",\"duration\":3}]。只输出JSON。",
        prompt: (script.content as string).slice(0, 3000),
      },
      promptAi
    );

    await job.updateProgress(60);

    let shots: Array<{ description: string; duration: number }> = [];
    try {
      const text = result?.text || String(result);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) shots = JSON.parse(jsonMatch[0]);
    } catch {}

    if (shots.length === 0) {
      const paragraphs = (script.content as string).split("\n").filter((l: string) => l.trim().length > 10);
      shots = paragraphs.slice(0, 8).map((p: string) => ({ description: p.slice(0, 100), duration: 3 }));
    }

    // Save storyboard
    const storyboardData = JSON.stringify(shots.map((s, i) => ({ index: i, title: `镜头${i + 1}`, description: s.description, duration: s.duration })));

    await u.db("t_chatHistory").where({ projectId, type: "storyboard" }).delete().catch((err: any) => { console.error("[background]", err.message); });
    await u.db("t_chatHistory").insert({ projectId, type: "storyboard", data: storyboardData, createdAt: Date.now() } as any);

    await job.updateProgress(80);

    // Update pipeline status
    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "storyboard" })
      .update({ status: "success", result: JSON.stringify({ shotCount: shots.length }), completedAt: Date.now() });

    // Chain: submit image job
    await imageQueue.add("image", {
      batchId,
      projectId,
      step: "image",
      payload: { ...payload, shotCount: shots.length },
    });

    await job.updateProgress(100);
    console.log(`[Storyboard Worker] Project ${projectId}: ${shots.length} shots`);
    return { projectId, shotCount: shots.length };
  },
  { connection, concurrency: 5 }
);

worker.on("failed", (job, err) => {
  console.error(`[Storyboard Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Storyboard Worker] Started, waiting for jobs...");
