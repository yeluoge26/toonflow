import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateViralScript, VIRAL_TEMPLATES } from "@/lib/viralEngine";
const router = express.Router();

// 从创意想法生成爆款结构
export default router.post(
  "/",
  validateFields({
    idea: z.string().min(1),
    template: z.string().optional(),
    duration: z.number().optional(),
    style: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { idea, template, duration, style } = req.body;
      const templateKey = template || Object.keys(VIRAL_TEMPLATES)[0];
      if (!VIRAL_TEMPLATES[templateKey]) {
        return res.status(400).send(error(`模板不存在: ${templateKey}，可用模板: ${Object.keys(VIRAL_TEMPLATES).join(", ")}`));
      }
      const result = await generateViralScript(idea, templateKey, {
        duration: duration || 20000,
        style: style || "cinematic",
      });
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
