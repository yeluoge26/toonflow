import express from "express";
import { success } from "@/lib/responseFormat";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post("/", async (req, res) => {
  res.status(200).send(success(costTracker.getTodaySummary()));
});
