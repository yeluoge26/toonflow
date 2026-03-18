import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import evolutionEngine, { PromptGenome } from "@/lib/evolutionEngine";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const promptRows = await u.db("t_prompts")
    .where("type", "evolved")
    .select("defaultValue");

  const population: PromptGenome[] = promptRows
    .map((r: any) => {
      try { return JSON.parse(r.defaultValue); } catch { return null; }
    })
    .filter(Boolean)
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
