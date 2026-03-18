import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    dailyBudget: z.number().min(1),
  }),
  async (req, res) => {
    costTracker.setBudget(req.body.dailyBudget);
    res.status(200).send(success({
      message: `每日预算已设为 $${req.body.dailyBudget}`,
      budget: req.body.dailyBudget,
    }));
  }
);
