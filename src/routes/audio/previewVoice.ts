import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateSpeech } from "@/utils/ai/audio";
import u from "@/utils";
const router = express.Router();

// Preview a voice with a sample text
export default router.post(
  "/",
  validateFields({
    text: z.string().max(100).optional().default("你好，这是语音预览测试。"),
    voiceId: z.string().optional(),
    emotion: z.string().optional(),
    speed: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const result = await generateSpeech(req.body);
      const fileName = `preview/${Date.now()}.${result.format}`;
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
