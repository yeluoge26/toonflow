import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { createSeries } from "@/lib/seriesEngine";
const router = express.Router();

// 创建系列
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    name: z.string().min(1),
    worldView: z.object({
      setting: z.string(),
      tone: z.string(),
      rules: z.array(z.string()),
    }),
    sharedCharacters: z.array(z.number()).optional(),
    sharedScenes: z.array(z.number()).optional(),
    sharedStyle: z.object({
      artStyle: z.string(),
      colorGrading: z.string(),
      musicTheme: z.string(),
    }).optional(),
    seriesArc: z.object({
      theme: z.string(),
      emotionCurve: z.array(z.string()),
    }),
  }),
  async (req, res) => {
    try {
      const id = await createSeries({
        projectId: req.body.projectId,
        name: req.body.name,
        worldView: req.body.worldView,
        sharedCharacters: req.body.sharedCharacters || [],
        sharedScenes: req.body.sharedScenes || [],
        sharedStyle: req.body.sharedStyle || { artStyle: "", colorGrading: "", musicTheme: "" },
        episodes: [],
        seriesArc: req.body.seriesArc,
        status: "draft",
        createdAt: Date.now(),
      });
      res.status(200).send(success({ id, message: "系列创建成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
