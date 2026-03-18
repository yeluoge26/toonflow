import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";
import { storyboardQueue } from "../queue/queues";

const connection = createConnection();

const worker = new Worker(
  "script",
  async (job) => {
    const { batchId, projectId, payload } = job.data;
    console.log(`[Script Worker] Processing project ${projectId} (batch: ${batchId})`);

    await job.updateProgress(10);

    // Dynamic imports to avoid loading everything at startup
    const u = (await import("../utils")).default;
    const { autoGenerateScript } = await import("../lib/autoScriptGenerator");
    const evolutionEngine = (await import("../lib/evolutionEngine")).default;

    // Get or generate prompt
    let promptText = payload.promptText;
    if (!promptText) {
      try {
        const genome = await u.db("t_promptGenome").where("status", "active").orderBy("score", "desc").first();
        if (genome) {
          const parsed = JSON.parse(genome.variables || "{}");
          promptText = evolutionEngine.genomeToPrompt({ ...genome, variables: parsed, id: genome.promptId, parentIds: [], createdAt: genome.createdAt } as any);
        }
      } catch {}
      if (!promptText) {
        promptText = `生成一个${payload.style || "霸道总裁"}类型的30秒短视频剧本，前3秒必须有强冲突，必须有反转，以【黑屏】结尾。`;
      }
    }

    await job.updateProgress(20);

    // Generate script with validation and auto-rewrite
    const result = await autoGenerateScript({
      promptText,
      style: payload.style,
      maxRewrites: 2,
    });

    await job.updateProgress(70);

    // Save to database
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

    // Update pipeline task status
    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "script" })
      .update({ status: "success", result: JSON.stringify({ accepted: result.accepted, rewrites: result.rewrites }), completedAt: Date.now() });

    await job.updateProgress(90);

    // Chain: submit storyboard job
    await storyboardQueue.add("storyboard", {
      batchId,
      projectId,
      step: "storyboard",
      payload: { ...payload, scriptGenerated: true },
    });

    await job.updateProgress(100);
    console.log(`[Script Worker] Project ${projectId} script done (accepted: ${result.accepted})`);
    return { projectId, accepted: result.accepted, rewrites: result.rewrites };
  },
  {
    connection,
    concurrency: 5, // Can process 5 scripts in parallel
  }
);

worker.on("failed", (job, err) => {
  console.error(`[Script Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("completed", (job) => {
  console.log(`[Script Worker] Job ${job.id} completed`);
});

console.log("[Script Worker] Started, waiting for jobs...");
