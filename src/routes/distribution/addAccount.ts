import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    platform: z.enum(["tiktok", "youtube", "instagram", "douyin", "bilibili"]),
    username: z.string(),
    proxyIp: z.string().optional(),
    deviceFingerprint: z.string().optional(),
    cookies: z.string().optional(),
    accessToken: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { platform, username, proxyIp, deviceFingerprint, cookies, accessToken } = req.body;

      // Check duplicate
      const existing = await u.db("t_distribution_account").where({ platform, username }).first();
      if (existing) return res.status(400).send(error("该平台账号已存在"));

      const [id] = await u.db("t_distribution_account").insert({
        platform,
        username,
        status: "active",
        proxyIp: proxyIp || null,
        deviceFingerprint: deviceFingerprint || null,
        cookies: cookies || null,
        accessToken: accessToken || null,
        lastActiveAt: Date.now(),
        postsToday: 0,
        createdAt: Date.now(),
      });

      res.status(200).send(success({ id, platform, username, status: "active" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
