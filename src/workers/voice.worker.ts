import "../env";
import { Worker } from "bullmq";
import { createConnection } from "../queue/connection";
import { scoreQueue } from "../queue/queues";

const connection = createConnection();

const worker = new Worker(
  "voice",
  async (job) => {
    const { batchId, projectId, payload } = job.data;
    console.log(`[Voice Worker] Processing project ${projectId}`);

    await job.updateProgress(10);
    const u = (await import("../utils")).default;
    const { generateSpeech, extractDialogues } = await import("../utils/ai/audio");

    const script = await u.db("t_script").where("projectId", projectId).first();
    let generated = 0;

    if (script?.content) {
      const dialogues = extractDialogues(script.content as string);

      for (let i = 0; i < dialogues.length; i++) {
        try {
          const result = await generateSpeech({
            text: dialogues[i].line,
            emotion: dialogues[i].emotion || "neutral",
          });

          const fileName = `${projectId}/audio/${Date.now()}_${i}.${result.format}`;
          await u.oss.writeFile(fileName, result.audioBuffer);
          generated++;
        } catch (err: any) {
          console.error(`[Voice Worker] Dialogue ${i} failed:`, err.message);
        }
        await job.updateProgress(10 + Math.round((i / dialogues.length) * 80));
      }
    }

    await u.db("t_pipelineTask")
      .where({ batchId, projectId, step: "voice" })
      .update({ status: "success", result: JSON.stringify({ generated }), completedAt: Date.now() });

    // Chain: score
    await scoreQueue.add("score", { batchId, projectId, step: "score", payload });

    await job.updateProgress(100);
    console.log(`[Voice Worker] Project ${projectId}: ${generated} audio files`);
    return { projectId, generated };
  },
  { connection, concurrency: 5 }
);

worker.on("failed", (job, err) => {
  console.error(`[Voice Worker] Job ${job?.id} failed:`, err.message);
});

console.log("[Voice Worker] Started, waiting for jobs...");
