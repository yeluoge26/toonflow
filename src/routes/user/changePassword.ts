import express from "express";
import u from "@/utils";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6, "密码至少6位"),
  }),
  async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).send(error("未登录"));

    const user = await u.db("t_user").where("id", userId).first();
    if (!user) return res.status(404).send(error("用户不存在"));

    // bcrypt 比较（兼容旧明文密码）
    const isValid = bcrypt.compareSync(oldPassword, user.password) || user.password === oldPassword;
    if (!isValid) return res.status(400).send(error("原密码错误"));

    if (newPassword === oldPassword) return res.status(400).send(error("新密码不能与原密码相同"));

    const hashed = bcrypt.hashSync(newPassword, 10);
    await u.db("t_user").where("id", userId).update({ password: hashed, forcePasswordChange: 0 });

    res.status(200).send(success({ message: "密码修改成功" }));
  },
);
