import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AIService } from "../../ai/ai.service";

@Injectable()
export class ScoreService {
  constructor(
    private prisma: PrismaService,
    private ai: AIService,
  ) {}

  async scoreProject(projectId: number) {
    // Use existing scoring engine
    const result = await this.ai.scoreProject(projectId);
    return result;
  }

  async getScores(filters: { projectId?: number; label?: string; limit?: number }) {
    return this.prisma.score.findMany({
      where: {
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.label ? { label: filters.label } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
    });
  }

  async submitMetrics(data: {
    projectId: number;
    platform: string;
    views: number;
    likes: number;
    comments?: number;
    shares?: number;
    completionRate?: number;
  }) {
    const now = BigInt(Date.now());
    const likeRate = data.views > 0 ? data.likes / data.views : 0;

    return this.prisma.metric.create({
      data: {
        projectId: data.projectId,
        platform: data.platform,
        views: data.views,
        likes: data.likes,
        comments: data.comments || 0,
        shares: data.shares || 0,
        completionRate: data.completionRate || 0,
        likeRate,
        fetchedAt: now,
        createdAt: now,
      },
    });
  }

  async getAutoFilterDecision(score: number): Promise<"discard" | "review" | "publish"> {
    if (score < 5.0) return "discard";
    if (score >= 7.0) return "publish";
    return "review";
  }
}
