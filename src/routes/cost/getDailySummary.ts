import express from "express";
import u from "@/utils";
import { db } from "@/utils/db";
import { success } from "@/lib/responseFormat";
import costTracker from "@/lib/costControl";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const runtime = await costTracker.getTodaySummaryFromDB();

  // Get model usage stats from DB
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const usageByModel = await db("t_modelUsage")
    .select(
      "manufacturer", "model", "moduleKey",
      db.raw("COUNT(*) as calls"),
      db.raw("SUM(inputTokens) as inputTokens"),
      db.raw("SUM(outputTokens) as outputTokens"),
      db.raw("SUM(duration) as totalDuration"),
      db.raw("SUM(CASE WHEN status = 'success' OR status = 'streaming' THEN 1 ELSE 0 END) as successCalls"),
      db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCalls"),
    )
    .where("createdAt", ">=", todayStart)
    .groupBy("manufacturer", "model")
    .catch(() => []);

  const totalUsage = await db("t_modelUsage")
    .select(
      db.raw("COUNT(*) as totalCalls"),
      db.raw("SUM(inputTokens) as totalInputTokens"),
      db.raw("SUM(outputTokens) as totalOutputTokens"),
      db.raw("SUM(duration) as totalDuration"),
    )
    .first().catch(() => ({}));

  // Get pricing config
  const pricing = await db("t_modelPricing").select("*").catch(() => []);

  // Get all configured models for mapping
  const configs = await db("t_config").select("id", "type", "model", "manufacturer").catch(() => []);

  // Calculate cost per model
  const modelCosts = usageByModel.map((m: any) => {
    const price = pricing.find((p: any) => p.manufacturer === m.manufacturer && p.model === m.model);
    let cost = 0;
    if (price) {
      if (price.unit === "per_1m_tokens") {
        cost = ((m.inputTokens || 0) * price.inputPrice + (m.outputTokens || 0) * price.outputPrice) / 1000000;
      } else if (price.unit === "per_image") {
        cost = (m.successCalls || 0) * price.outputPrice;
      } else if (price.unit === "per_second") {
        cost = (m.successCalls || 0) * 5 * price.outputPrice; // assume 5s per video
      }
    }
    return { ...m, estimatedCost: Math.round(cost * 10000) / 10000 };
  });

  res.status(200).send(success({
    ...runtime,
    usageByModel: modelCosts,
    totalUsage,
    pricing,
    configs,
  }));
});
