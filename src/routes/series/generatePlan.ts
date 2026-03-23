import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getSeriesDetail, generateEpisodePlan } from "@/lib/seriesEngine";
import u from "@/utils";
const router = express.Router();

// 自动生成集数计划
export default router.post(
  "/",
  validateFields({
    seriesId: z.number(),
    episodeCount: z.number().min(1).max(100),
  }),
  async (req, res) => {
    try {
      const { seriesId, episodeCount } = req.body;
      const series = await getSeriesDetail(seriesId);
      const episodes = generateEpisodePlan(series, episodeCount);

      // Save to DB
      await u.db("t_series").where("id", seriesId).update({
        episodes: JSON.stringify(episodes),
      });

      res.status(200).send(success({ episodes, message: `已生成${episodes.length}集计划` }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
