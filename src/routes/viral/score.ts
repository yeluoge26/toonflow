import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { scoreRetention } from "@/lib/viralEngine";
const router = express.Router();

// 评估视频结构的留存率
export default router.post(
  "/",
  validateFields({
    structure: z.object({
      hook: z.object({
        type: z.string(),
        text: z.string(),
        durationMs: z.number(),
        shotType: z.string(),
        emotion: z.string(),
        technique: z.string(),
      }),
      mid: z.object({
        type: z.string(),
        beats: z.array(z.object({
          text: z.string(),
          durationMs: z.number(),
          emotion: z.string(),
          intensity: z.number(),
        })),
      }),
      ending: z.object({
        type: z.string(),
        text: z.string(),
        durationMs: z.number(),
        shotType: z.string(),
        emotion: z.string(),
      }),
      totalDurationMs: z.number(),
      retentionScore: z.number(),
    }),
  }),
  async (req, res) => {
    try {
      const { structure } = req.body;
      const result = scoreRetention(structure);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
