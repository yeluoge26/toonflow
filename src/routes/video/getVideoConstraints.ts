import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadVideoConstraints, saveVideoConstraints, buildVideoConstraintPrompt, type VideoConstraints } from "@/lib/videoConstraints";

const router = express.Router();

// 获取视频约束配置
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const constraints = await loadVideoConstraints(projectId);

      // Convert Maps to plain objects for JSON serialization
      const result = {
        projectId: constraints.projectId,
        globalLock: constraints.globalLock,
        sceneLocks: Object.fromEntries(constraints.sceneLocks),
        characterLocks: Object.fromEntries(constraints.characterLocks),
      };

      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(`获取视频约束失败: ${err.message}`));
    }
  }
);
