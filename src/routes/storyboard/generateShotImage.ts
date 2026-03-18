import express from "express";
import { success } from "@/lib/responseFormat";
import generateImageTool from "@/agents/storyboard/generateImageTool";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuid } from "uuid";
const router = express.Router();

// 生成分镜图
export default router.post(
  "/",
  validateFields({
    segmentId: z.number(),
    title: z.string(),
    x: z.number(),
    y: z.number().nullable(),
    cells: z.array(z.object({ src: z.string().optional(), prompt: z.string() })),
    scriptId: z.number(),
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { cells, scriptId, projectId } = req.body;

      const buffer = await generateImageTool(cells, scriptId, projectId);

      const tmpPath = path.join(os.tmpdir(), uuid() + ".jpg");
      fs.writeFileSync(tmpPath, buffer);

      const result = success(buffer);
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      return res.json(result);
    } catch (error) {
      console.error("生成片段图失败:", error);
      return res.status(500).json({
        success: false,
        message: "生成片段图失败",
        error: error instanceof Error ? error.message : "未知错误",
      });
    }
  },
);
