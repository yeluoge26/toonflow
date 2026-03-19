import express from "express";
import { success } from "@/lib/responseFormat";
import cache from "@/lib/cache";
const router = express.Router();

export default router.post("/", async (req, res) => {
  await cache.flush();
  res.status(200).send(success({ message: "缓存已清空" }));
});
