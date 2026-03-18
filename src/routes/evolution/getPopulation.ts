import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import evolutionEngine, { PromptGenome } from "@/lib/evolutionEngine";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const promptRows = await u.db("t_promptGenome")
    .where("status", "active")
    .select("*");

  const population: PromptGenome[] = promptRows
    .map((r: any) => ({
      id: r.promptId,
      generation: r.generation,
      variables: JSON.parse(r.variables || "{}"),
      score: r.score || 0,
      performanceScore: r.performanceScore || 0,
      parentIds: r.parentId ? [r.parentId] : [],
      createdAt: r.createdAt,
    }))
    .sort((a: PromptGenome, b: PromptGenome) => b.score - a.score);

  res.status(200).send(success({
    count: population.length,
    avgScore: population.length > 0
      ? Math.round(population.reduce((s, g) => s + g.score, 0) / population.length * 10) / 10
      : 0,
    avgGeneration: population.length > 0
      ? Math.round(population.reduce((s, g) => s + g.generation, 0) / population.length * 10) / 10
      : 0,
    genomes: population.map(g => ({
      id: g.id,
      generation: g.generation,
      variables: g.variables,
      score: g.score,
      performanceScore: g.performanceScore,
      prompt: evolutionEngine.genomeToPrompt(g),
    })),
  }));
});
