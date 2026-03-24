import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { orchestrate } from "@/lib/orchestrator";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptText: z.string().min(1),
    genre: z.string().default("韩剧"),
    artStyle: z.string().default("写实"),
    qualityThreshold: z.number().min(0).max(100).optional(),
    maxIterations: z.number().min(1).max(10).optional(),
    targetDuration: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptText, genre, artStyle, qualityThreshold, maxIterations, targetDuration } = req.body;
      const result = await orchestrate({
        projectId,
        scriptText,
        genre,
        artStyle,
        qualityThreshold,
        maxIterations,
        targetDuration,
      });
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
