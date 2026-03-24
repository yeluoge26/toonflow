import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { optimizePrompt, batchOptimize } from "@/agents/director/promptOptimizer";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    description: z.string().min(1).optional(),
    descriptions: z.array(z.string().min(1)).optional(),
    config: z.object({
      style: z.string().default("写实"),
      genre: z.string().default("韩剧"),
      globalLighting: z.string().default("cinematic lighting"),
      globalMood: z.string().default("dramatic atmosphere"),
    }),
    characterLocks: z.array(z.string()).optional(),
  }),
  async (req, res) => {
    try {
      const { description, descriptions, config, characterLocks } = req.body;

      if (descriptions && descriptions.length > 0) {
        // Batch mode
        const results = await batchOptimize(descriptions, config);
        res.status(200).send(success({ prompts: results }));
      } else if (description) {
        // Single mode
        const result = await optimizePrompt(description, config, characterLocks);
        res.status(200).send(success({ prompt: result }));
      } else {
        res.status(400).send(error("Either 'description' or 'descriptions' is required"));
      }
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
