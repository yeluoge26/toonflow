import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { recordMetrics, recordFeatures } from "@/lib/feedbackEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    videoId: z.number(),
    platform: z.string(),
    views: z.number().default(0),
    likes: z.number().default(0),
    comments: z.number().default(0),
    shares: z.number().default(0),
    completionRate: z.number().min(0).max(1).default(0),
    avgWatchTime: z.number().default(0),
    features: z.object({
      hookType: z.string(),
      hookStrength: z.number(),
      emotionPeakIntensity: z.number(),
      pacingScore: z.number(),
      shotDurationAvg: z.number(),
      cameraVariety: z.number(),
      styleType: z.string(),
      templateId: z.number().optional(),
      totalDuration: z.number(),
    }).optional(),
  }),
  async (req, res) => {
    try {
      const { videoId, platform, views, likes, comments, shares, completionRate, avgWatchTime, features } = req.body;

      await recordMetrics({
        videoId,
        platform,
        views,
        likes,
        comments,
        shares,
        completionRate,
        avgWatchTime,
        collectedAt: Date.now(),
      });

      if (features) {
        await recordFeatures({ videoId, ...features });
      }

      res.status(200).send(success({ videoId, recorded: true }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
