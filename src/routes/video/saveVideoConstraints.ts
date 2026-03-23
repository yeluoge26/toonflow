import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { saveVideoConstraints, type VideoConstraints } from "@/lib/videoConstraints";

const router = express.Router();

// 保存视频约束配置
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    globalLock: z.object({
      artStyle: z.string().optional(),
      colorGrading: z.string().optional(),
      cameraLens: z.string().optional(),
      noSubtitle: z.boolean().optional(),
      noRandomCharacters: z.boolean().optional(),
      aspectRatio: z.string().optional(),
    }),
    sceneLocks: z.any().optional(),
    characterLocks: z.any().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, globalLock, sceneLocks, characterLocks } = req.body;

      const constraints: VideoConstraints = {
        projectId,
        globalLock: {
          artStyle: globalLock?.artStyle || "",
          colorGrading: globalLock?.colorGrading || "",
          cameraLens: globalLock?.cameraLens || "",
          noSubtitle: globalLock?.noSubtitle !== false,
          noRandomCharacters: globalLock?.noRandomCharacters !== false,
          aspectRatio: globalLock?.aspectRatio || "16:9",
        },
        sceneLocks: new Map(Object.entries(sceneLocks || {})),
        characterLocks: new Map(Object.entries(characterLocks || {})),
      };

      await saveVideoConstraints(constraints);

      res.status(200).send(success(null, "视频约束保存成功"));
    } catch (err: any) {
      res.status(500).send(error(`保存视频约束失败: ${err.message}`));
    }
  }
);
