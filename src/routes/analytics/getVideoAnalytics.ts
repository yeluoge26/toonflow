import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getVideoMetrics, getProjectAnalytics } from "@/lib/feedbackEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    videoId: z.number().optional(),
    projectId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { videoId, projectId } = req.body;

      if (videoId) {
        const metrics = await getVideoMetrics(videoId);
        res.status(200).send(success({ videoId, metrics }));
      } else if (projectId) {
        const analytics = await getProjectAnalytics(projectId);
        res.status(200).send(success(analytics));
      } else {
        res.status(400).send(error("请提供 videoId 或 projectId"));
      }
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
