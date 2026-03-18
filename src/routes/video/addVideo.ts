import express from "express";
import u from "@/utils";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";
import { v4 as uuid } from "uuid";
const router = express.Router();

// 新增视频
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    type: z.string(),
    resolution: z.string(),
    filePath: z.array(z.string()),
    duration: z.number(),
    prompt: z.string(),
  }),
  async (req, res) => {
    const { scriptId, type, resolution, filePath, duration, prompt } = req.body;

    let model = "";
    if (type.includes("doubao")) {
      model = "doubao-seedance-1-5-pro-251215";
    }
    if (type.includes("sora")) {
      model = "sora-2";
    }

    let firstFrame: string;
    let storyboardImgs: string[];
    try {
      firstFrame = new URL(filePath[0]).pathname;
      storyboardImgs = filePath.map((path: string) => new URL(path).pathname);
    } catch (e) {
      return res.status(400).send(error("无效的文件路径URL"));
    }

    await u.db("t_video").insert({
      time: duration,
      resolution: resolution,
      prompt: prompt,
      model: type,
      firstFrame: firstFrame,
      storyboardImgs: JSON.stringify(storyboardImgs),
      scriptId: scriptId,
    });

    res.status(200).send(success({ message: "新增视频成功" }));
  },
);
