import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { reviewStoryboardShots } from "@/agents/director/storyboardReview";
const router = express.Router();

// Review all segments in a storyboard at once
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body;

      const history = await u.db("t_chatHistory")
        .where({ projectId })
        .first();

      if (!history?.data) {
        return res.status(400).send(error("未找到分镜数据"));
      }

      const storyboardData = JSON.parse(history.data as string);

      // If data is an array of shots/segments
      const segments = Array.isArray(storyboardData) ? storyboardData : [storyboardData];

      const reviews = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const shots = Array.isArray(segment) ? segment : [segment];

        const review = await reviewStoryboardShots(
          projectId,
          scriptId,
          i,
          shots.map((s: any) => ({
            title: s.title || s.description || `镜头${i}`,
            cells: s.cells || [],
            fragmentContent: s.description || s.fragmentContent || "",
          }))
        );
        reviews.push(review);
      }

      // Calculate overall score
      const scores = reviews.map(r =>
        r.score === "A" ? 4 : r.score === "B" ? 3 : r.score === "C" ? 2 : 1
      );
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const overallGrade = avgScore >= 3.5 ? "A" : avgScore >= 2.5 ? "B" : avgScore >= 1.5 ? "C" : "D";

      res.status(200).send(success({
        overallGrade,
        avgScore: Math.round(avgScore * 10) / 10,
        segmentCount: reviews.length,
        reviews,
        totalIssues: reviews.reduce((sum, r) => sum + r.issues.length, 0),
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
