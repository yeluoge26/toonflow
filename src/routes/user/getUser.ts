import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 获取用户
export default router.get("/", async (req, res) => {
  const data = await u.db("t_user").select("id", "name").first();

  res.status(200).send(success(data));
});
