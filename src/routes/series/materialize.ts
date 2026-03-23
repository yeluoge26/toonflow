import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { materializeEpisodes } from "@/lib/seriesEngine";
const router = express.Router();

// 一键创建所有集数的项目
export default router.post(
  "/",
  validateFields({
    seriesId: z.number(),
  }),
  async (req, res) => {
    try {
      await materializeEpisodes(req.body.seriesId);
      res.status(200).send(success({ message: "所有集数项目已创建" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
