import express from "express";
import { success } from "@/lib/responseFormat";
import cache from "@/lib/cache";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const stats = await cache.getStats();
  res.status(200).send(success(stats));
});
