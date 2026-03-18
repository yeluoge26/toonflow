import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [batchCount, projectCount, scoreStats, metricsTotal] = await Promise.all([
      this.prisma.batch.count(),
      this.prisma.project.count(),
      this.prisma.score.aggregate({
        _avg: { finalScore: true },
        _count: true,
      }),
      this.prisma.metric.aggregate({
        _sum: { views: true, likes: true },
        _avg: { completionRate: true },
      }),
    ]);

    return {
      production: { batches: batchCount, projects: projectCount },
      quality: {
        scored: scoreStats._count,
        avgScore: Math.round((scoreStats._avg.finalScore || 0) * 10) / 10,
      },
      performance: {
        totalViews: metricsTotal._sum.views || 0,
        totalLikes: metricsTotal._sum.likes || 0,
        avgCompletionRate: Math.round((metricsTotal._avg.completionRate || 0) * 100) / 100,
      },
    };
  }

  async getMetricsByProject(projectId: number) {
    return this.prisma.metric.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }
}
