import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const batches = await u.db("t_batch").orderBy("createdAt", "desc").limit(50).select("*");

  const result = batches.map((b: any) => ({
    ...b,
    config: b.config ? JSON.parse(b.config) : {},
    progress: b.totalCount ? Math.round((b.successCount / b.totalCount) * 100) : 0,
  }));

  res.status(200).send(success(result));
});
