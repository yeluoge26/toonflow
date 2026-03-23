import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadAntiDriftConfig } from "@/lib/antiDrift";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const config = await loadAntiDriftConfig(projectId);
      res.status(200).send(success(config));
    } catch (err: any) {
      res.status(500).send(error(`获取防跑偏配置失败: ${err.message}`));
    }
  },
);
