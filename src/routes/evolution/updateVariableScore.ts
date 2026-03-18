import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Update variable scores based on performance data
export default router.post(
  "/",
  validateFields({
    id: z.number(),
    score: z.number(),
    incrementUsage: z.boolean().optional().default(true),
  }),
  async (req, res) => {
    const { id, score, incrementUsage } = req.body;
    const updates: any = { score };
    if (incrementUsage) updates.usageCount = u.db.raw("usageCount + 1");
    await u.db("t_variablePool").where("id", id).update(updates);
    res.status(200).send(success({ message: "变量评分已更新" }));
  }
);
