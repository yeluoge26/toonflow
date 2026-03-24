import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 获取项目（支持分页）
export default router.post("/", async (req, res) => {
  const page = req.body.page || 1;
  const pageSize = Math.min(req.body.pageSize || 50, 100);
  const userId = (req as any).user?.id;

  let query = u.db("t_project").orderBy("createTime", "desc");
  if (userId) query = query.where("userId", userId);

  const data = await query.limit(pageSize).offset((page - 1) * pageSize);
  res.status(200).send(success(data));
});
