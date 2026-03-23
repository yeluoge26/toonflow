import express from "express";
import { db } from "@/utils/db";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    dailyBudget: z.number().min(1).optional(),
    pricing: z.array(z.object({
      id: z.number().optional(),
      manufacturer: z.string(),
      model: z.string(),
      type: z.enum(["text", "image", "video"]),
      inputPrice: z.number(),
      outputPrice: z.number(),
      unit: z.string(),
    })).optional(),
  }),
  async (req, res) => {
    if (req.body.dailyBudget) {
      costTracker.setBudget(req.body.dailyBudget);
    }

    // Update pricing
    if (req.body.pricing) {
      for (const p of req.body.pricing) {
        if (p.id) {
          await db("t_modelPricing").where("id", p.id).update({
            inputPrice: p.inputPrice,
            outputPrice: p.outputPrice,
            unit: p.unit,
            updatedAt: Date.now(),
          });
        } else {
          await db("t_modelPricing").insert({
            manufacturer: p.manufacturer,
            model: p.model,
            type: p.type,
            inputPrice: p.inputPrice,
            outputPrice: p.outputPrice,
            unit: p.unit,
            currency: "CNY",
            updatedAt: Date.now(),
          });
        }
      }
    }

    res.status(200).send(success({ message: "配置已更新" }));
  }
);
