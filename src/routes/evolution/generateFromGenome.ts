import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import evolutionEngine, { PromptGenome } from "@/lib/evolutionEngine";
const router = express.Router();

// Generate a script from a specific genome
export default router.post(
  "/",
  validateFields({
    genomeId: z.string(),
  }),
  async (req, res) => {
    try {
      const { genomeId } = req.body;

      const row = await u.db("t_promptGenome")
        .where("promptId", genomeId)
        .first();

      if (!row) return res.status(404).send(error("Genome不存在"));

      const genome: PromptGenome = {
        id: row.promptId,
        generation: row.generation,
        variables: JSON.parse(row.variables || "{}"),
        score: row.score || 0,
        performanceScore: row.performanceScore || 0,
        parentIds: row.parentId ? [row.parentId] : [],
        createdAt: row.createdAt,
      };
      const prompt = evolutionEngine.genomeToPrompt(genome);

      res.status(200).send(success({
        genomeId: genome.id,
        generation: genome.generation,
        variables: genome.variables,
        prompt,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
