import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import taskQueue from "@/lib/taskQueue";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    type: z.enum(["video", "image", "audio", "script"]),
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
    priority: z.number().optional(),
    data: z.record(z.string(), z.any()),
  }),
  async (req, res) => {
    try {
      const { type, projectId, scriptId, priority, data } = req.body;
      const id = await taskQueue.enqueue({ type, projectId, scriptId, priority, data });
      res.status(200).send(success({ taskId: id }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
