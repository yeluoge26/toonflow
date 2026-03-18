import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateSpeech, extractDialogues } from "@/utils/ai/audio";
const router = express.Router();

// Synchronous batch TTS - generates all dialogue audio and returns results
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    projectId: z.number(),
    maxConcurrent: z.number().optional().default(3),
  }),
  async (req, res) => {
    try {
      const { scriptId, projectId, maxConcurrent } = req.body;

      const script = await u.db("t_script").where("id", scriptId).select("content").first();
      if (!script?.content) return res.status(400).send(error("剧本内容为空"));

      const dialogues = extractDialogues(script.content as string);
      if (dialogues.length === 0) return res.status(400).send(error("未检测到对白"));

      // Get character voice mappings
      const characters = await u.db("t_assets")
        .where("projectId", projectId)
        .where("type", "role")
        .select("name", "remark");

      const voiceMap = new Map<string, string>();
      for (const char of characters) {
        try {
          if (char.remark) {
            const meta = JSON.parse(char.remark as string);
            if (meta.voiceId) voiceMap.set(char.name as string, meta.voiceId);
          }
        } catch {}
      }

      // Generate TTS with concurrency control
      const results: Array<{
        character: string;
        line: string;
        filePath?: string;
        duration?: number;
        error?: string;
      }> = [];

      // Process in batches of maxConcurrent
      for (let i = 0; i < dialogues.length; i += maxConcurrent) {
        const batch = dialogues.slice(i, i + maxConcurrent);
        const batchResults = await Promise.allSettled(
          batch.map(async (dialogue) => {
            const result = await generateSpeech({
              text: dialogue.line,
              voiceId: voiceMap.get(dialogue.character),
              emotion: dialogue.emotion || "neutral",
            });

            const fileName = `${projectId}/audio/${Date.now()}_${results.length}.${result.format}`;
            await u.oss.writeFile(fileName, result.audioBuffer);

            return {
              character: dialogue.character,
              line: dialogue.line,
              filePath: fileName,
              duration: result.duration,
            };
          })
        );

        for (const r of batchResults) {
          if (r.status === "fulfilled") {
            results.push(r.value);
          } else {
            results.push({
              character: batch[batchResults.indexOf(r)]?.character || "unknown",
              line: batch[batchResults.indexOf(r)]?.line || "",
              error: r.reason?.message || "生成失败",
            });
          }
        }
      }

      const succeeded = results.filter(r => r.filePath);
      const failed = results.filter(r => r.error);

      res.status(200).send(success({
        total: dialogues.length,
        succeeded: succeeded.length,
        failed: failed.length,
        results,
        totalDuration: succeeded.reduce((sum, r) => sum + (r.duration || 0), 0),
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
