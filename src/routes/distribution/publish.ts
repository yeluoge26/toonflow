import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { publishVideo } from "@/utils/distribution";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    videoPath: z.string(),
    title: z.string(),
    description: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    platform: z.enum(["douyin", "tiktok", "bilibili", "kuaishou"]),
    projectId: z.number(),
    coverImage: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const result = await publishVideo(req.body);
      if (result.success) {
        res.status(200).send(success(result));
      } else {
        res.status(400).send(error(result.error || "发布失败"));
      }
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
