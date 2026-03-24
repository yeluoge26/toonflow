import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { scoreViralPotential } from "@/agents/director/directorAgent";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    plan: z.object({
      shots: z.array(z.object({
        index: z.number(),
        duration: z.number(),
        camera: z.string(),
        movement: z.string(),
        emotion: z.string(),
        lens: z.string(),
        dof: z.string(),
        lighting: z.string(),
        composition: z.string(),
        transition: z.string(),
        characters: z.array(z.string()),
        action: z.string(),
        dialogue: z.string().optional(),
        sound: z.string().optional(),
        prompt: z.string(),
      })),
      totalDuration: z.number(),
      rhythmScore: z.number(),
      retentionScore: z.number(),
    }),
  }),
  async (req, res) => {
    try {
      const { plan } = req.body;
      const result = scoreViralPotential(plan);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
