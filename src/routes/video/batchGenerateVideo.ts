import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import taskQueue from "@/lib/taskQueue";
const router = express.Router();

// Batch generate videos for all shots in a script
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    configId: z.number().optional(),
    resolution: z.string().optional().default("720p"),
    duration: z.number().optional().default(5),
    mode: z.string().optional().default("single"),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, configId, resolution, duration, mode } = req.body;

      // Get all storyboard images
      const images = await u.db("t_image")
        .where("scriptId", scriptId)
        .where("projectId", projectId)
        .select("id", "filePath", "videoPrompt");

      if (images.length === 0) {
        return res.status(400).send(error("未找到分镜图片"));
      }

      // Get AI config
      const aiConfig = configId
        ? await u.db("t_config").where("id", configId).first()
        : await u.db("t_config").where("type", "video").first();

      if (!aiConfig) {
        return res.status(400).send(error("未配置视频模型"));
      }

      // Enqueue each shot as a video generation task
      const taskIds: number[] = [];
      for (const img of images) {
        const taskId = await taskQueue.enqueue({
          type: "video",
          projectId,
          scriptId,
          priority: 0,
          data: {
            imageId: img.id,
            filePath: img.filePath,
            prompt: img.videoPrompt || "",
            resolution,
            duration,
            mode,
            configId: aiConfig.id,
          },
        });
        taskIds.push(taskId);
      }

      res.status(200).send(success({
        message: `已提交 ${taskIds.length} 个视频生成任务`,
        taskIds,
        totalShots: images.length,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
