import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    platform: z.enum(["tiktok", "youtube", "instagram", "douyin", "bilibili"]).optional(),
  }),
  async (req, res) => {
    try {
      let query = u.db("t_distribution_account").orderBy("createdAt", "desc");
      if (req.body.platform) query = query.where("platform", req.body.platform);

      const accounts = await query.select(
        "id", "platform", "username", "status", "proxyIp",
        "lastActiveAt", "postsToday", "createdAt",
      );

      res.status(200).send(success(accounts));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
