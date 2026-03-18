import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Record template usage and increment counter
export default router.post(
  "/",
  validateFields({
    templateId: z.number(),
  }),
  async (req, res) => {
    try {
      const { templateId } = req.body;
      const template = await u.db("t_template").where("id", templateId).first();
      if (!template) return res.status(404).send(error("模板不存在"));

      await u.db("t_template").where("id", templateId).update({
        usageCount: (template.usageCount || 0) + 1,
        updatedAt: Date.now(),
      });

      res.status(200).send(success({
        template: {
          ...template,
          usageCount: (template.usageCount || 0) + 1,
          structure: template.structure ? JSON.parse(template.structure as string) : {},
          tags: template.tags ? JSON.parse(template.tags as string) : [],
          variables: template.variables ? JSON.parse(template.variables as string) : {},
        },
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
