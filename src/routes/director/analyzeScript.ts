import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { analyzeScript } from "@/agents/director/directorAgent";
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
  }),
  async (req, res) => {
    try {
      const { scriptText, config } = req.body;
      const result = await analyzeScript(scriptText, config);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
