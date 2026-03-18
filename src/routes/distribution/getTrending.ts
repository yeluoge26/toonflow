import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { fetchTrending } from "@/utils/distribution/trending";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    platform: z.enum(["douyin", "tiktok", "bilibili", "kuaishou"]).optional().default("douyin"),
  }),
  async (req, res) => {
    try {
      const topics = await fetchTrending(req.body.platform);
      res.status(200).send(success(topics));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
