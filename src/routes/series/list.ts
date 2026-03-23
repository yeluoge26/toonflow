import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { listSeries } from "@/lib/seriesEngine";
const router = express.Router();

// 列出所有系列
export default router.post(
  "/",
  validateFields({}),
  async (req, res) => {
    try {
      const series = await listSeries();
      res.status(200).send(success(series));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
