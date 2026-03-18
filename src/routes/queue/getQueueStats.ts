import express from "express";
import { success, error } from "@/lib/responseFormat";
import { QueueService } from "@/services/queue.service";
const router = express.Router();

export default router.post("/", async (req, res) => {
  try {
    const stats = await QueueService.getQueueStats();
    res.status(200).send(success(stats));
  } catch (err: any) {
    // Redis not available - return empty stats
    res.status(200).send(success({
      error: "Redis未连接",
      message: err.message,
    }));
  }
});
