import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import scheduler from "@/lib/scheduler";
const router = express.Router();

// Run a single production cycle manually
export default router.post(
  "/",
  validateFields({
    batchSize: z.number().optional(),
    style: z.string().optional(),
  }),
  async (req, res) => {
    try {
      if (req.body.batchSize) scheduler.setConfig({ batchSize: req.body.batchSize });
      if (req.body.style) scheduler.setConfig({ defaultStyle: req.body.style });

      const result = await scheduler.runProductionCycle();
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
