import express from "express";
import u from "@/utils";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";
const router = express.Router();

// Rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function setToken(payload: string | object, expiresIn: string | number, secret: string): string {
  if (!payload || typeof secret !== "string" || !secret) {
    throw new Error("参数不合法");
  }
  return (jwt.sign as any)(payload, secret, { expiresIn });
}

// 登录
export default router.post(
  "/",
  validateFields({
    username: z.string(),
    password: z.string(),
    rememberMe: z.boolean().optional(),
  }),
  async (req, res) => {
    const { username, password, rememberMe } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    // Rate limiting
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.count >= MAX_ATTEMPTS && Date.now() - attempt.lastAttempt < WINDOW_MS) {
      return res.status(429).send(error("登录尝试过多，请15分钟后重试"));
    }

    const data = await u.db("t_user").where("name", "=", username).first();
    if (!data) {
      loginAttempts.set(ip, { count: (attempt?.count || 0) + 1, lastAttempt: Date.now() });
      return res.status(400).send(error("用户名或密码错误"));
    }

    // bcrypt 密码比较（兼容旧明文密码：首次匹配后自动升级为哈希）
    const isMatch = bcrypt.compareSync(password, data!.password) || data!.password === password;
    if (isMatch && data!.name == username) {
      // 如果是明文密码匹配，自动升级为 bcrypt 哈希
      if (!data!.password.startsWith("$2")) {
        const hashed = bcrypt.hashSync(password, 10);
        await u.db("t_user").where("id", data!.id).update({ password: hashed });
      }
      // Clear rate limit on success
      loginAttempts.delete(ip);

      const tokenSecret = await u.db("t_setting").where("userId", data.id).select("tokenKey").first();
      const expiresIn = rememberMe ? "30d" : "7d";

      const token = setToken(
        { id: data!.id, name: data!.name },
        expiresIn,
        tokenSecret?.tokenKey as string,
      );

      return res.status(200).send(success({
        token: "Bearer " + token,
        name: data!.name,
        id: data!.id,
        forcePasswordChange: !!data!.forcePasswordChange,
      }, "登录成功"));
    } else {
      loginAttempts.set(ip, { count: (attempt?.count || 0) + 1, lastAttempt: Date.now() });
      return res.status(400).send(error("用户名或密码错误"));
    }
  },
);
