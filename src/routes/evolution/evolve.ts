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
      const promptRows = await u.db("t_promptGenome")
        .where("status", "active")
        .select("*");

      const population: PromptGenome[] = promptRows.map((r: any) => ({
        id: r.promptId,
        generation: r.generation,
        variables: JSON.parse(r.variables || "{}"),
        score: r.score || 0,
        performanceScore: r.performanceScore || 0,
        parentIds: r.parentId ? [r.parentId] : [],
        createdAt: r.createdAt,
      }));

      if (population.length < 10) {
        return res.status(400).send(error("种群数量不足，请先初始化（至少10个）"));
      }

      // Evolve
      const nextGen = await evolutionEngine.evolve(population, req.body.mutationRate);

      // Deprecate old generation and save new generation
      await u.db("t_promptGenome").where("status", "active").update({ status: "deprecated" });
      for (const genome of nextGen) {
        await u.db("t_promptGenome").insert({
          promptId: genome.id,
          template: evolutionEngine.genomeToPrompt(genome),
          variables: JSON.stringify(genome.variables),
          score: genome.score,
          performanceScore: genome.performanceScore,
          generation: genome.generation,
          parentId: genome.parentIds[0] || null,
          status: "active",
          usageCount: 0,
          createdAt: Date.now(),
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
