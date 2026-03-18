import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Add a custom viral template
export default router.post(
  "/",
  validateFields({
    name: z.string(),
    category: z.string(),
    hook: z.string(),
    conflict: z.string(),
    twist: z.string(),
    ending: z.string(),
    tags: z.array(z.string()).optional().default([]),
  }),
  async (req, res) => {
    try {
      const { name, category, hook, conflict, twist, ending, tags } = req.body;

      const [id] = await u.db("t_prompts").insert({
        code: `template_${Date.now()}`,
        name: `自定义模板-${name}`,
        type: "template",
        parentCode: category,
        defaultValue: JSON.stringify({
          name,
          category,
          structure: { hook, conflict, twist, ending },
          tags,
        }),
        customValue: null,
      });

      res.status(200).send(success({ id, message: "模板添加成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
