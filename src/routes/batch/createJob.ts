import express from "express";
import { success } from "@/lib/responseFormat";
import { createBatchFromTemplate } from "@/lib/batchProductionEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const { templateId, projectId, variations, episodeCount } = req.body;
  const job = await createBatchFromTemplate(templateId, projectId, variations || {}, episodeCount || 10);
  res.status(200).send(success(job));
});
