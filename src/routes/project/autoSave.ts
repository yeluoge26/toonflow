import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Generic auto-save endpoint for any project data
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    type: z.enum(["script", "outline", "storyboard", "novel"]),
    targetId: z.number(),
    data: z.record(z.string(), z.any()),
  }),
  async (req, res) => {
    try {
      const { projectId, type, targetId, data } = req.body;

      const tableMap: Record<string, string> = {
        script: "t_script",
        outline: "t_outline",
        storyboard: "t_chatHistory",
        novel: "t_novel",
      };

      const table = tableMap[type];
      if (!table) return res.status(400).send(error("未知的保存类型"));

      await u.db(table).where("id", targetId).update({
        ...data,
        updatedAt: Date.now(),
      });

      res.status(200).send(success({ message: "自动保存成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
