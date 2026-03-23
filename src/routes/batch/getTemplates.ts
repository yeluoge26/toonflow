import express from "express";
import { success } from "@/lib/responseFormat";
import { listTemplates } from "@/lib/batchProductionEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const templates = await listTemplates();
  res.status(200).send(success(templates));
});
