import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    keyName: z.string().optional(),
  }),
  async (req, res) => {
    let query = u.db("t_variablePool").orderBy("score", "desc");
    if (req.body.keyName) query = query.where("keyName", req.body.keyName);
    const pool = await query.select("*");

    // Group by keyName
    const grouped: Record<string, any[]> = {};
    for (const item of pool) {
      if (!grouped[item.keyName]) grouped[item.keyName] = [];
      grouped[item.keyName].push(item);
    }

    res.status(200).send(success({ pool: grouped, total: pool.length }));
  }
);
