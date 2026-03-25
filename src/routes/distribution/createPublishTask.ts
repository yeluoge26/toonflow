import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { createPublishTask } from "@/lib/distributionEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    videoId: z.number(),
    projectId: z.number(),
    platform: z.enum(["tiktok", "youtube", "instagram", "douyin", "bilibili"]),
    title: z.string().optional(),
    description: z.string().optional(),
    scheduledAt: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const task = await createPublishTask(req.body);
      res.status(200).send(success(task));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
