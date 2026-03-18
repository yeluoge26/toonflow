import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import batchEngine from "@/lib/batchEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    batchId: z.string(),
  }),
  async (req, res) => {
    const result = await batchEngine.getBatchStatus(req.body.batchId);
    if (!result) return res.status(404).send(error("批次不存在"));
    res.status(200).send(success(result));
  }
);
