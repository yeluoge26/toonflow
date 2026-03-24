import initDB from "@/lib/initDB";

import { db } from "@/utils/db";
import express from "express";
import { success } from "@/lib/responseFormat";
const router = express.Router();

// 清空所有表 (sqlite) — 仅管理员
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.id !== 1) return res.status(403).send({ message: "需要管理员权限" });
  next();
};
export default router.post("/", requireAdmin, async (req, res) => {
  await initDB(db, true);
  res.status(200).send(success("清空数据库成功"));
});
