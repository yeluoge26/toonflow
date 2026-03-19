import express from "express";
import { success } from "@/lib/responseFormat";
import monitor from "@/lib/resourceMonitor";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const [stats, overload, cost] = await Promise.all([
    monitor.getStats(),
    monitor.isOverloaded(),
    monitor.getCostSummary(),
  ]);

  res.status(200).send(success({
    ...stats,
    overloaded: overload,
    cost,
  }));
});
