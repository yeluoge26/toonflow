import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import costTracker from "@/lib/costControl";
const router = express.Router();

// Production dashboard - overall factory statistics
export default router.post("/", async (req, res) => {
  // Get batch stats
  const batchStats = await u.db("t_batch")
    .select(
      u.db.raw("COUNT(*) as totalBatches"),
      u.db.raw("SUM(totalCount) as totalVideos"),
      u.db.raw("SUM(successCount) as successVideos"),
      u.db.raw("SUM(failCount) as failVideos")
    )
    .first();

  // Get score distribution
  const scoreStats = await u.db("t_scores")
    .select(
      u.db.raw("COUNT(*) as total"),
      u.db.raw("AVG(finalScore) as avgScore"),
      u.db.raw("SUM(CASE WHEN label = 'high' THEN 1 ELSE 0 END) as highCount"),
      u.db.raw("SUM(CASE WHEN label = 'medium' THEN 1 ELSE 0 END) as mediumCount"),
      u.db.raw("SUM(CASE WHEN label = 'low' THEN 1 ELSE 0 END) as lowCount")
    )
    .first();

  // Get pipeline task stats
  const pipelineStats = await u.db("t_pipelineTask")
    .select(
      u.db.raw("step"),
      u.db.raw("COUNT(*) as total"),
      u.db.raw("SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success"),
      u.db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed")
    )
    .groupBy("step");

  // Get metrics summary
  const metricsStats = await u.db("t_metrics")
    .select(
      u.db.raw("SUM(views) as totalViews"),
      u.db.raw("SUM(likes) as totalLikes"),
      u.db.raw("AVG(completionRate) as avgCompletionRate")
    )
    .first();

  const totalBatches = Number(batchStats?.totalBatches || 0);
  const totalVideos = Number(batchStats?.totalVideos || 0);
  const successRate = totalVideos > 0
    ? Math.round((Number(batchStats?.successVideos || 0) / totalVideos) * 100) : 0;
  const cost = costTracker.getTodaySummary();

  // Flat structure matching admin.html expectations
  res.status(200).send(success({
    totalBatches,
    totalVideos,
    successRate,
    activeBatches: 0,
    completedToday: 0,
    qualityHigh: Number(scoreStats?.highCount || 0),
    qualityMedium: Number(scoreStats?.mediumCount || 0),
    qualityLow: Number(scoreStats?.lowCount || 0),
    costUsed: cost?.used || 0,
    costBudget: cost?.budget || 50,
    pipeline: pipelineStats.map((s: any) => ({
      step: s.step,
      total: Number(s.total),
      success: Number(s.success),
      failed: Number(s.failed),
    })),
    totalViews: Number(metricsStats?.totalViews || 0),
    totalLikes: Number(metricsStats?.totalLikes || 0),
  }));
});
