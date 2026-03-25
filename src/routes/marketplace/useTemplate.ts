import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { useTemplate } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    templateId: z.number(),
    userId: z.number(),
  }),
  async (req, res) => {
    try {
      const { templateId, userId } = req.body;
      const result = await useTemplate(templateId, userId);
      if (!result.success) {
        res.status(400).send(error(result.error || "操作失败"));
        return;
      }
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
