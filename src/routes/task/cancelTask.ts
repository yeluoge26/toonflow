import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import taskQueue from "@/lib/taskQueue";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
  }),
  async (req, res) => {
    await taskQueue.cancel(req.body.id);
    res.status(200).send(success({ message: "任务已取消" }));
  }
);
