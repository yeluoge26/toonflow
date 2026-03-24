import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { analyzeScript, generateShotPlan } from "@/agents/director/directorAgent";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptText: z.string().min(1),
    config: z.object({
      genre: z.string().default("韩剧"),
      targetDuration: z.number().default(60),
      rhythmProfile: z.enum(["fast", "slow", "dynamic"]).default("dynamic"),
      emotionCurve: z.enum(["rising", "wave", "climax_end"]).default("wave"),
    }),
    analysis: z.object({
      rhythmCurve: z.array(z.object({ timestamp: z.number(), intensity: z.number() })).optional(),
      emotionBeats: z.array(z.object({ timestamp: z.number(), emotion: z.string(), intensity: z.number() })).optional(),
      climaxPoints: z.array(z.number()).optional(),
      suggestedCuts: z.array(z.any()).optional(),
    }).optional(),
  }),
  async (req, res) => {
    try {
      const { scriptText, config, analysis: providedAnalysis } = req.body;

      // If no analysis provided, generate one first
      const analysis = providedAnalysis?.rhythmCurve?.length
        ? providedAnalysis
        : await analyzeScript(scriptText, config);

      const result = await generateShotPlan(scriptText, analysis, config);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
