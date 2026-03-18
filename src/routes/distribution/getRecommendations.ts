import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { fetchTrending, recommendContent } from "@/utils/distribution/trending";
const router = express.Router();

// Get content recommendations based on trending topics and available IPs
export default router.post(
  "/",
  validateFields({
    platform: z.string().optional().default("douyin"),
  }),
  async (req, res) => {
    try {
      const topics = await fetchTrending(req.body.platform);

      // Get available character IPs
      const characters = await u.db("t_character").select("name", "personality");
      const ips = characters.map((c: any) => ({
        name: c.name,
        tags: (c.personality || "").split(/[,，、\s]+/).filter(Boolean),
      }));

      const recommendations = await recommendContent(topics, ips);

      res.status(200).send(success({
        trending: topics,
        recommendations,
        platform: req.body.platform,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
