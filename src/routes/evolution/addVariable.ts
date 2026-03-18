import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    keyName: z.string(),
    value: z.string(),
    weight: z.number().optional().default(1.0),
  }),
  async (req, res) => {
    try {
      const { keyName, value, weight } = req.body;
      // Check for duplicate
      const exists = await u.db("t_variablePool").where({ keyName, value }).first();
      if (exists) return res.status(400).send(error("该变量已存在"));

      const [id] = await u.db("t_variablePool").insert({
        keyName, value, weight, score: 0, usageCount: 0, createdAt: Date.now(),
      });
      res.status(200).send(success({ id, message: "变量添加成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
