import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { PLANS, PlanType } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    userId: z.number(),
  }),
  async (req, res) => {
    try {
      const { userId } = req.body;
      const billing = await u.db("t_user_billing").where("userId", userId).first();
      const planKey = (billing?.plan as PlanType) || "free";
      const plan = PLANS[planKey];

      res.status(200).send(success({
        userId,
        plan: planKey,
        planName: plan.name,
        price: plan.price,
        credits: billing?.credits || 0,
        limits: plan.limits,
        createdAt: billing?.createdAt,
        updatedAt: billing?.updatedAt,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
