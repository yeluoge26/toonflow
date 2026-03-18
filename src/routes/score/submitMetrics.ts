import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { calculatePerformanceScore } from "@/lib/scoringEngine";
const router = express.Router();

// Submit real-world performance data for feedback loop
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    platform: z.string(),
    postId: z.string().optional(),
    views: z.number(),
    likes: z.number(),
    comments: z.number().optional().default(0),
    shares: z.number().optional().default(0),
    completionRate: z.number().optional().default(0),
  }),
  async (req, res) => {
    try {
      const { projectId, platform, postId, views, likes, comments, shares, completionRate } = req.body;

      const likeRate = views > 0 ? likes / views : 0;
      const shareRate = views > 0 ? shares / views : 0;

      await u.db("t_metrics").insert({
        projectId,
        platform,
        postId: postId || "",
        views,
        likes,
        comments,
        shares,
        completionRate,
        likeRate,
        fetchedAt: Date.now(),
        createdAt: Date.now(),
      });

      // Calculate performance score
      const perfScore = calculatePerformanceScore({ views, likeRate, completionRate, shareRate });

      res.status(200).send(success({
        performanceScore: Math.round(perfScore * 10) / 10,
        metrics: { views, likes, likeRate, completionRate, shareRate },
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
