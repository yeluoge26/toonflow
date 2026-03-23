import express from "express";
import { success } from "@/lib/responseFormat";
import { getBatchProgress } from "@/lib/batchProductionEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const progress = await getBatchProgress(req.body.jobId);
  res.status(200).send(success(progress));
});
