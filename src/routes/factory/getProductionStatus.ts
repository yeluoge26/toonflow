import express from "express";
import { success } from "@/lib/responseFormat";
import scheduler from "@/lib/scheduler";
import dataCollector from "@/lib/dataCollector";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const status = scheduler.getStatus();
  res.status(200).send(success(status));
});
