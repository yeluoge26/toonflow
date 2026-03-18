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

      const row = await u.db("t_prompts")
        .where("code", `evolved_${genomeId}`)
        .first();

      if (!row) return res.status(404).send(error("Genome不存在"));

      const genome: PromptGenome = JSON.parse(row.defaultValue as string);
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
