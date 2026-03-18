import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    count: z.number(),
    textModel: z.string().optional(),
    imageModel: z.string().optional(),
    videoModel: z.string().optional(),
    audioModel: z.string().optional(),
  }),
  async (req, res) => {
    const estimate = costTracker.estimateBatchCost(req.body);
    const canAfford = costTracker.canAfford(estimate.total);

    res.status(200).send(success({
      ...estimate,
      canAfford,
      dailyBudget: costTracker.getTodaySummary().budget,
      dailyRemaining: costTracker.getTodaySummary().remaining,
    }));
  }
);
