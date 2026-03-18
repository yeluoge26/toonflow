import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { QueueService } from "@/services/queue.service";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    step: z.enum(["script", "storyboard", "image", "video", "voice", "score"]),
    action: z.enum(["pause", "resume"]),
  }),
  async (req, res) => {
    try {
      const { step, action } = req.body;
      if (action === "pause") {
        await QueueService.pauseQueue(step);
      } else {
        await QueueService.resumeQueue(step);
      }
      res.status(200).send(success({ message: `队列 ${step} 已${action === "pause" ? "暂停" : "恢复"}` }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
