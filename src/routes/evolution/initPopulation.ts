import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import evolutionEngine from "@/lib/evolutionEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    count: z.number().min(10).max(500).optional().default(100),
  }),
  async (req, res) => {
    try {
      const population = await evolutionEngine.generateInitialPopulation(req.body.count);
      res.status(200).send(success({
        message: `已生成 ${population.length} 个初始Prompt`,
        count: population.length,
        sample: population.slice(0, 3).map(g => ({
          id: g.id,
          variables: g.variables,
        })),
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
