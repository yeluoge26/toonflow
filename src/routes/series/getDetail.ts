import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getSeriesDetail } from "@/lib/seriesEngine";
const router = express.Router();

// 获取系列详情（含集数状态）
export default router.post(
  "/",
  validateFields({
    seriesId: z.number(),
  }),
  async (req, res) => {
    try {
      const series = await getSeriesDetail(req.body.seriesId);
      res.status(200).send(success(series));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
