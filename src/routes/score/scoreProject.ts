import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { scoreProject, aiScoreProject, autoFilter } from "@/lib/scoringEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    useAI: z.boolean().optional().default(false),
  }),
  async (req, res) => {
    try {
      const { projectId, useAI } = req.body;
      const score = useAI
        ? await aiScoreProject(projectId)
        : await scoreProject(projectId);

      if (!score) return res.status(400).send(error("评分失败，项目可能没有内容"));

      const action = autoFilter(score);

      res.status(200).send(success({
        ...score,
        action,
        actionLabel: action === "discard" ? "建议丢弃" : action === "review" ? "需人工复审" : "可自动发布",
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
