import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { analyzeViralPotential } from "@/lib/viralEngine";
const router = express.Router();

// 分析脚本的爆款潜力
export default router.post(
  "/",
  validateFields({
    script: z.string().min(1),
  }),
  async (req, res) => {
    try {
      const { script } = req.body;
      const result = analyzeViralPotential(script);
      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
