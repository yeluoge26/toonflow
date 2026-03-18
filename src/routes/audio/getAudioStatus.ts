import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Check status of batch audio generation tasks
export default router.post(
  "/",
  validateFields({
    taskIds: z.array(z.number()),
  }),
  async (req, res) => {
    try {
      const { taskIds } = req.body;
      const tasks = await u.db("t_taskQueue")
        .whereIn("id", taskIds)
        .select("id", "status", "progress", "result", "errorReason");

      const completed = tasks.filter((t: any) => t.status === "completed");
      const failed = tasks.filter((t: any) => t.status === "failed");
      const pending = tasks.filter((t: any) => t.status === "pending" || t.status === "running");

      const audioFiles = completed.map((t: any) => {
        try { return JSON.parse(t.result); } catch { return null; }
      }).filter(Boolean);

      res.status(200).send(success({
        total: taskIds.length,
        completed: completed.length,
        failed: failed.length,
        pending: pending.length,
        progress: Math.round((completed.length / taskIds.length) * 100),
        audioFiles,
        allDone: pending.length === 0,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
