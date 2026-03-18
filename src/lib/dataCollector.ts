import u from "@/utils";

interface CollectedMetrics {
  projectId: number;
  platform: string;
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  completionRate: number;
}

class DataCollector {
  // Manually submit metrics (from API or scraping)
  async submitMetrics(metrics: CollectedMetrics): Promise<void> {
    const likeRate = metrics.views > 0 ? metrics.likes / metrics.views : 0;

    await u.db("t_metrics").insert({
      projectId: metrics.projectId,
      platform: metrics.platform,
      postId: metrics.postId,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      completionRate: metrics.completionRate,
      likeRate: likeRate,
      fetchedAt: Date.now(),
      createdAt: Date.now(),
    });

    // Update prompt genome scores if linked
    await this.updatePromptScores(metrics.projectId, metrics);
  }

  // Update prompt performance scores based on video metrics
  private async updatePromptScores(projectId: number, metrics: CollectedMetrics): Promise<void> {
    // Find which prompt was used for this project
    const project = await u.db("t_project").where("id", projectId).first();
    if (!project?.name) return;

    // Extract batch/prompt info from project name (format: type_batchId_index)
    const match = project.name.match(/^(.+?)_(batch_[a-z0-9]+)_(\d+)$/);
    if (!match) return;

    const batchId = match[2];

    // Calculate performance score
    const perfScore = (
      0.3 * Math.min(10, Math.log(metrics.views + 1) / Math.log(100000) * 10) +
      0.3 * (metrics.views > 0 ? (metrics.likes / metrics.views) * 100 : 0) +
      0.3 * metrics.completionRate * 10 +
      0.1 * (metrics.views > 0 ? (metrics.shares / metrics.views) * 200 : 0)
    );

    // Find linked prompt genome for this project
    const genomeRow = await u.db("t_promptGenome")
      .where("status", "active")
      .first();

    const promptId = genomeRow?.promptId || batchId;

    // Save to prompt_metrics
    try {
      await u.db("t_promptMetrics").insert({
        promptId,
        projectId,
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        completionRate: metrics.completionRate,
        calculatedScore: Math.round(perfScore * 10) / 10,
        createdAt: Date.now(),
      });

      // Update the genome's performanceScore
      if (genomeRow) {
        await u.db("t_promptGenome")
          .where("promptId", promptId)
          .update({ performanceScore: Math.round(perfScore * 10) / 10 });
      }
    } catch (err) {
      console.error("[DataCollector] Failed to write t_promptMetrics:", err);
    }
  }

  // Get performance summary for a batch
  async getBatchPerformance(batchId: string): Promise<{
    totalViews: number;
    totalLikes: number;
    avgCompletionRate: number;
    bestProject: any;
    worstProject: any;
  }> {
    // Get all projects in this batch
    const projects = await u.db("t_project")
      .where("name", "like", `%${batchId}%`)
      .select("id", "name");

    const projectIds = projects.map((p: any) => p.id);
    if (projectIds.length === 0) {
      return { totalViews: 0, totalLikes: 0, avgCompletionRate: 0, bestProject: null, worstProject: null };
    }

    const metrics = await u.db("t_metrics")
      .whereIn("projectId", projectIds)
      .select("*");

    let totalViews = 0;
    let totalLikes = 0;
    let totalCompletion = 0;
    let bestViews = -1;
    let worstViews = Infinity;
    let bestProject: any = null;
    let worstProject: any = null;

    for (const m of metrics) {
      totalViews += m.views || 0;
      totalLikes += m.likes || 0;
      totalCompletion += m.completionRate || 0;

      if ((m.views || 0) > bestViews) {
        bestViews = m.views;
        bestProject = m;
      }
      if ((m.views || 0) < worstViews) {
        worstViews = m.views;
        worstProject = m;
      }
    }

    return {
      totalViews,
      totalLikes,
      avgCompletionRate: metrics.length > 0 ? Math.round((totalCompletion / metrics.length) * 100) / 100 : 0,
      bestProject,
      worstProject,
    };
  }
}

const dataCollector = new DataCollector();
export default dataCollector;
