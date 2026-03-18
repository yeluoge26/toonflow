import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { AIService } from "../ai/ai.service";

@Processor("score")
@Injectable()
export class ScoreProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private ai: AIService,
  ) {
    super();
  }

  async process(job: Job) {
    const { batchId, projectId } = job.data;

    const score = await this.ai.scoreProject(projectId);

    // Update pipeline
    await this.prisma.pipelineTask.updateMany({
      where: { batchId, projectId, step: "score" },
      data: { status: "success", result: JSON.stringify(score), completedAt: BigInt(Date.now()) },
    });

    // Update batch completion
    const batch = await this.prisma.batch.findUnique({ where: { batchId } });
    if (batch) {
      const completed = await this.prisma.pipelineTask.count({
        where: { batchId, step: "score", status: "success" },
      });
      await this.prisma.batch.update({
        where: { batchId },
        data: {
          successCount: completed,
          updatedAt: BigInt(Date.now()),
          ...(completed >= batch.totalCount ? { status: "completed" } : {}),
        },
      });
    }

    return { projectId, score: score.finalScore, label: score.label };
  }
}
