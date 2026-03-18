import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";

const connection = createConnection();

const worker = new Worker(
  "score",
  async (job) => {
    const { batchId, projectId } = job.data;
    console.log(`[Score Worker] Processing project ${projectId}`);

    await job.updateProgress(10);
    const u = (await import("../utils")).default;
    const { scoreProject } = await import("../lib/scoringEngine");

    const score = await scoreProject(projectId);

    await job.updateProgress(80);

    // Update pipeline status
    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "score" })
      .update({ status: "success", result: JSON.stringify(score), completedAt: Date.now() });

    // Update batch progress
    const batch = await u.db("t_batch").where("batchId", batchId).first();
    if (batch) {
      const completedCount = await u.db("t_pipelineTask")
        .where({ batchId, step: "score", status: "success" })
        .count("* as c")
        .first();

      await u.db("t_batch").where("batchId", batchId).update({
        successCount: Number((completedCount as any)?.c || 0),
        updatedAt: Date.now(),
        ...(Number((completedCount as any)?.c || 0) >= batch.totalCount ? { status: "completed" } : {}),
      });
    }

    await job.updateProgress(100);
    console.log(`[Score Worker] Project ${projectId}: score=${score.finalScore} label=${score.label}`);
    return { projectId, score: score.finalScore, label: score.label };
  },
  { connection, concurrency: 10 }
);

worker.on("failed", (job, err) => {
  console.error(`[Score Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Score Worker] Started, waiting for jobs...");
