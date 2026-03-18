import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 保存视频
export default router.post(
  "/",
  validateFields({
    id: z.number(),
    filePath: z.string(),
    storyboardImgs: z.array(z.string()).optional().nullable(),
    prompt: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    time: z.number().optional().nullable(),
    resolution: z.string().optional().nullable(),
  }),
  async (req, res) => {
    const { filePath, id, time, resolution, storyboardImgs, prompt, model } = req.body;

    let savePath: string;

    try {
      savePath = new URL(filePath).pathname;
    } catch {
      savePath = filePath;
    }

    const oldVideo = await u.db("t_video").where("id", id).select("filePath", "scriptId").first();

    let trimmedImgs: string[] = [];
    let firstFramePath: string | undefined;

    if (storyboardImgs && storyboardImgs.length > 0) {
      trimmedImgs = storyboardImgs.map((img: string) => {
        try {
          return new URL(img).pathname;
        } catch {
          return img;
        }
      });
      firstFramePath = trimmedImgs[0];
    }

    if (!oldVideo) {
      await u.db("t_video").insert({
        id,
        filePath: savePath,
        time,
        resolution,
        model,
        firstFrame: firstFramePath,
        storyboardImgs: JSON.stringify(trimmedImgs),
        prompt,
      });
      return res.status(200).send({ message: "保存视频成功" });
    }

    if (oldVideo.filePath !== savePath) {
      await u.db.transaction(async (trx) => {
        // 1. 删除临时表中属于新视频的资源
        const newTempVideo = await trx("t_tempAssets").where({ videoId: id, filePath: savePath }).first();

        if (newTempVideo) {
          await trx("t_tempAssets").where({ videoId: id, filePath: savePath }).del();
        }

        // 2. 检查旧视频是否已经在临时表，不在则插入
        const oldTempVideo = await trx("t_tempAssets").where({ videoId: id, filePath: oldVideo.filePath }).first();
        if (!oldTempVideo) {
          await trx("t_tempAssets").insert({
            videoId: id,
            type: "视频",
            filePath: oldVideo.filePath,
            scriptId: oldVideo.scriptId,
          });
        }

        // 3. 更新视频表
        await trx("t_video")
          .where("id", id)
          .update({
            filePath: savePath,
            time,
            resolution,
            model,
            firstFrame: firstFramePath,
            storyboardImgs: JSON.stringify(trimmedImgs),
            prompt,
          });
      });
    } else {
      await u
        .db("t_video")
        .where("id", id)
        .update({
          time,
          resolution,
          model,
          firstFrame: firstFramePath,
          storyboardImgs: JSON.stringify(trimmedImgs),
          prompt,
        });
    }

    return res.status(200).send({ message: "保存视频成功" });
  }
);
