import express from "express";
import u from "@/utils";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 保存用户（密码 bcrypt 哈希）
export default router.post(
  "/",
  validateFields({
    name: z.string(),
    password: z.string().min(6, "密码至少6位"),
    id: z.number(),
  }),
  async (req, res) => {
    const { name, password, id } = req.body;
    const hashed = bcrypt.hashSync(password, 10);
    await u.db("t_user").where("id", id).update({ name, password: hashed });
    res.status(200).send(success("保存设置成功"));
  },
);
