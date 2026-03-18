import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import batchEngine from "@/lib/batchEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    type: z.string(),
    count: z.number().min(1).max(200),
    priority: z.enum(["high", "normal", "low"]).optional(),
    style: z.string().optional(),
    template: z.string().optional(),
    duration: z.number().optional(),
    artStyle: z.string().optional(),
    variables: z.record(z.string(), z.any()).optional(),
  }),
  async (req, res) => {
    try {
      const result = await batchEngine.createBatch(req.body);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
