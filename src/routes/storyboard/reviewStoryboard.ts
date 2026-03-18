import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { reviewStoryboardShots } from "@/agents/director/storyboardReview";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    segmentId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, segmentId } = req.body;

      // Get shots for this segment from chat history
      const history = await u.db("t_chatHistory")
        .where({ projectId })
        .first();

      if (!history?.data) {
        return res.status(400).send(error("未找到分镜数据"));
      }

      // Parse storyboard data to find shots for this segment
      // The shots are stored in the agent's state within chat history
      const review = await reviewStoryboardShots(projectId, scriptId, segmentId, []);

      res.status(200).send(success(review));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
