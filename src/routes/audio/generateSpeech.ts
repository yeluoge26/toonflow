import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateSpeech } from "@/utils/ai/audio";
import u from "@/utils";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    text: z.string().min(1),
    voiceId: z.string().optional(),
    emotion: z.string().optional(),
    projectId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { text, voiceId, emotion, projectId } = req.body;
      const result = await generateSpeech({ text, voiceId, emotion });

      // Save audio file
      const fileName = `${projectId || "global"}/${u.uuid()}.${result.format}`;
      await u.oss.writeFile(fileName, result.audioBuffer);

      res.status(200).send(success({
        filePath: fileName,
        duration: result.duration,
        format: result.format,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
