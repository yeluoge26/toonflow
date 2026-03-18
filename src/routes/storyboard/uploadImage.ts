import express from "express";
import u from "@/utils";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";
import { v4 as uuid } from "uuid";
const router = express.Router();

// 图片上传
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    base64Data: z.string(),
  }),
  async (req, res) => {
    const { base64Data, projectId } = req.body;
    const savePath = `/${projectId}/chat/${uuid()}.jpg`;
    const match = base64Data.match(/base64,([A-Za-z0-9+/=]+)/);
    if (!match) {
      return res.status(400).send(error("无效的base64数据格式"));
    }
    await u.oss.writeFile(savePath, Buffer.from(match[1] ?? "", "base64"));
    const url = await u.oss.getFileUrl(savePath);
    res.status(200).send(success(url));
  }
);
