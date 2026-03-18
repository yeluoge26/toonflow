import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { VIRAL_TEMPLATES, fillTemplate, generateCombinations } from "@/lib/templateEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    templateId: z.string(),
    variables: z.record(z.string(), z.any()).optional(),
    generateAll: z.boolean().optional().default(false),
    maxCount: z.number().optional().default(10),
  }),
  async (req, res) => {
    try {
      const { templateId, variables, generateAll, maxCount } = req.body;

      const template = VIRAL_TEMPLATES.find(t => t.id === templateId);
      if (!template) return res.status(404).send(error("模板不存在"));

      if (generateAll && variables) {
        // Generate all combinations
        const variableSets: Record<string, string[]> = {};
        for (const [key, value] of Object.entries(variables)) {
          variableSets[key] = Array.isArray(value) ? value : [value as string];
        }
        const results = generateCombinations(template, variableSets, maxCount);
        res.status(200).send(success({
          template: template.name,
          count: results.length,
          results,
        }));
      } else {
        // Single generation
        const filled = fillTemplate(template, variables || {});
        res.status(200).send(success({
          template: template.name,
          result: filled,
        }));
      }
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
