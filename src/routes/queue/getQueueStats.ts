import express from "express";
import u from "@/utils";
import { success, error } from "@/lib/responseFormat";
import { QueueService } from "@/services/queue.service";
const router = express.Router();

export default router.post("/", async (req, res) => {
  let bullmqStats = null;
  try {
    bullmqStats = await QueueService.getQueueStats();
  } catch {}

  // Get SQLite-based stats from available tables
  const batchStats = await u.db("t_batch")
    .select(
      u.db.raw("COUNT(*) as total"),
      u.db.raw("SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running"),
      u.db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
      u.db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed"),
      u.db.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as waiting")
    )
    .first().catch(() => ({ total: 0, running: 0, completed: 0, failed: 0, waiting: 0 }));
  const sqliteStats = batchStats;

  // Get model usage stats
  const usageStats = await u.db("t_modelUsage")
    .select(
      u.db.raw("COUNT(*) as totalCalls"),
      u.db.raw("SUM(CASE WHEN status = 'success' OR status = 'streaming' THEN 1 ELSE 0 END) as successCalls"),
      u.db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCalls"),
      u.db.raw("SUM(inputTokens) as totalInputTokens"),
      u.db.raw("SUM(outputTokens) as totalOutputTokens")
    )
    .first().catch(() => ({}));

  // Format as array for admin.html queue cards
  const queues = [];
  if (bullmqStats && !bullmqStats.error) {
    // BullMQ queues
    for (const [name, stats] of Object.entries(bullmqStats as Record<string, any>)) {
      queues.push({ name, ...stats });
    }
  }
  // Add SQLite queue as always-available fallback
  queues.push({
    name: "本地任务队列",
    waiting: Number(sqliteStats?.waiting || 0),
    active: Number(sqliteStats?.running || 0),
    completed: Number(sqliteStats?.completed || 0),
    failed: Number(sqliteStats?.failed || 0),
  });

  res.status(200).send(success({
    queues,
    redis: bullmqStats && !bullmqStats.error ? "connected" : "disconnected",
    modelUsage: usageStats,
  }));
});
