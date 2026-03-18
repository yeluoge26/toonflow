import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Publish a project element as a template
export default router.post(
  "/",
  validateFields({
    type: z.enum(["script", "storyboard", "style", "character"]),
    name: z.string(),
    category: z.string().optional().default(""),
    description: z.string().optional().default(""),
    sourceId: z.number().optional(),
    projectId: z.number().optional(),
    structure: z.string().optional().default(""),
    promptTemplate: z.string().optional().default(""),
    variables: z.string().optional().default("{}"),
    price: z.number().optional().default(0),
    tags: z.array(z.string()).optional().default([]),
  }),
  async (req, res) => {
    try {
      const { type, name, category, structure, promptTemplate, variables, tags } = req.body;

      const [id] = await u.db("t_template").insert({
        name,
        category,
        type,
        structure: structure || JSON.stringify({}),
        promptTemplate: promptTemplate || "",
        variables: variables || JSON.stringify({}),
        tags: JSON.stringify(tags),
        successRate: 0,
        usageCount: 0,
        avgScore: 0,
        isBuiltin: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const template = await u.db("t_template").where("id", id).first();

      res.status(200).send(
        success({
          message: "模板发布成功",
          template: {
            ...template,
            structure: template.structure ? JSON.parse(template.structure) : {},
            tags: template.tags ? JSON.parse(template.tags) : [],
            variables: template.variables ? JSON.parse(template.variables) : {},
          },
        }),
      );
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
