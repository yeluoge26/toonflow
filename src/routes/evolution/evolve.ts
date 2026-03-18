import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import evolutionEngine, { PromptGenome } from "@/lib/evolutionEngine";
const router = express.Router();

// Run one evolution cycle on the current population
export default router.post(
  "/",
  validateFields({
    mutationRate: z.number().optional().default(0.3),
  }),
  async (req, res) => {
    try {
      // Load current population from database
      const promptRows = await u.db("t_prompts")
        .where("type", "evolved")
        .select("defaultValue");

      const population: PromptGenome[] = promptRows
        .map((r: any) => {
          try { return JSON.parse(r.defaultValue); } catch { return null; }
        })
        .filter(Boolean);

      if (population.length < 10) {
        return res.status(400).send(error("种群数量不足，请先初始化（至少10个）"));
      }

      // Evolve
      const nextGen = await evolutionEngine.evolve(population, req.body.mutationRate);

      // Clear old evolved prompts and save new generation
      await u.db("t_prompts").where("type", "evolved").delete();
      for (const genome of nextGen) {
        await u.db("t_prompts").insert({
          code: `evolved_${genome.id}`,
          name: `进化Prompt-G${genome.generation}`,
          type: "evolved",
          parentCode: null,
          defaultValue: JSON.stringify(genome),
          customValue: null,
        });
      }

      const avgGeneration = Math.round(nextGen.reduce((s, g) => s + g.generation, 0) / nextGen.length * 10) / 10;

      res.status(200).send(success({
        message: `进化完成，新一代 ${nextGen.length} 个Prompt`,
        count: nextGen.length,
        avgGeneration,
        topGenomes: nextGen.slice(0, 5).map(g => ({
          id: g.id,
          generation: g.generation,
          variables: g.variables,
          score: g.score,
        })),
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
