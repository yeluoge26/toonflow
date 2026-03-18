import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Get comprehensive dashboard for a single project
export default router.post(
  "/",
  validateFields({ projectId: z.number() }),
  async (req, res) => {
    try {
      const { projectId } = req.body;

      const project = await u.db("t_project").where("id", projectId).first();
      if (!project) return res.status(404).send(error("项目不存在"));

      const [scripts, outlines, novels, assets, videos, scores, metrics] = await Promise.all([
        u.db("t_script").where("projectId", projectId).count("* as c").first(),
        u.db("t_outline").where("projectId", projectId).count("* as c").first(),
        u.db("t_novel").where("projectId", projectId).count("* as c").first(),
        u.db("t_assets").where("projectId", projectId).select("type"),
        u.db("t_video").whereIn("scriptId",
          u.db("t_script").where("projectId", projectId).select("id")
        ).select("state"),
        u.db("t_scores").where("projectId", projectId).first(),
        u.db("t_metrics").where("projectId", projectId).select("*"),
      ]);

      const assetsByType: Record<string, number> = {};
      for (const a of assets) {
        assetsByType[a.type as string] = (assetsByType[a.type as string] || 0) + 1;
      }

      const videoStats = {
        total: (videos as any[]).length,
        success: (videos as any[]).filter((v: any) => v.state === 1).length,
        failed: (videos as any[]).filter((v: any) => v.state === -1).length,
        pending: (videos as any[]).filter((v: any) => v.state === 0).length,
      };

      const totalViews = (metrics as any[]).reduce((sum: number, m: any) => sum + (m.views || 0), 0);
      const totalLikes = (metrics as any[]).reduce((sum: number, m: any) => sum + (m.likes || 0), 0);

      res.status(200).send(success({
        project,
        content: {
          scripts: Number((scripts as any)?.c || 0),
          outlines: Number((outlines as any)?.c || 0),
          novels: Number((novels as any)?.c || 0),
          assets: assetsByType,
        },
        videos: videoStats,
        quality: scores ? {
          finalScore: scores.finalScore,
          label: scores.label,
          hookScore: scores.hookScore,
          emotionScore: scores.emotionScore,
        } : null,
        performance: {
          totalViews,
          totalLikes,
          platforms: [...new Set((metrics as any[]).map((m: any) => m.platform))],
        },
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
