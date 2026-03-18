import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { QueueService } from "../../queue/queue.service";
import { v4 as uuid } from "uuid";

@Injectable()
export class BatchService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async createBatch(config: {
    type: string;
    count: number;
    priority?: string;
    style?: string;
    artStyle?: string;
    variables?: Record<string, any>;
  }) {
    const batchId = `batch_${uuid().slice(0, 8)}`;
    const now = BigInt(Date.now());

    // Create batch record
    await this.prisma.batch.create({
      data: {
        batchId,
        type: config.type,
        totalCount: config.count,
        priority: config.priority || "normal",
        status: "running",
        config: JSON.stringify(config),
        createdAt: now,
        updatedAt: now,
      },
    });

    const projectIds: number[] = [];

    for (let i = 0; i < config.count; i++) {
      // Create project
      const project = await this.prisma.project.create({
        data: {
          name: `${config.type}_${batchId}_${i + 1}`,
          intro: `Batch: ${config.type}`,
          type: config.type,
          artStyle: config.artStyle || "",
          videoRatio: "9:16",
          createTime: now,
          userId: 1,
        },
      });
      projectIds.push(project.id);

      // Create pipeline tasks
      const steps = ["script", "storyboard", "image", "video", "voice", "score"];
      for (const step of steps) {
        await this.prisma.pipelineTask.create({
          data: {
            taskId: `${batchId}_${project.id}_${step}`,
            batchId,
            projectId: project.id,
            step,
            status: step === "script" ? "pending" : "waiting",
            priority: config.priority === "high" ? 1 : config.priority === "low" ? 10 : 5,
            payload: JSON.stringify(config.variables || {}),
            createdAt: now,
          },
        });
      }

      // Submit to queue
      await this.queue.addPipeline(batchId, project.id, {
        ...config.variables,
        style: config.style,
        artStyle: config.artStyle,
      });
    }

    return { batchId, totalTasks: config.count * 6, projectIds };
  }

  async getBatchStatus(batchId: string) {
    const batch = await this.prisma.batch.findUnique({ where: { batchId } });
    if (!batch) return null;

    const tasks = await this.prisma.pipelineTask.findMany({
      where: { batchId },
      select: { step: true, status: true, projectId: true, errorMsg: true },
    });

    const stepStats: Record<string, Record<string, number>> = {};
    for (const task of tasks) {
      if (!stepStats[task.step]) stepStats[task.step] = {};
      stepStats[task.step][task.status] = (stepStats[task.step][task.status] || 0) + 1;
    }

    return {
      ...batch,
      config: batch.config ? JSON.parse(batch.config) : {},
      stepStats,
      progress: batch.totalCount ? Math.round((batch.successCount / batch.totalCount) * 100) : 0,
    };
  }

  async listBatches(limit = 50) {
    return this.prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async cancelBatch(batchId: string) {
    await this.prisma.pipelineTask.updateMany({
      where: { batchId, status: { in: ["pending", "waiting"] } },
      data: { status: "failed", errorMsg: "Batch cancelled" },
    });
    await this.prisma.batch.update({
      where: { batchId },
      data: { status: "failed", updatedAt: BigInt(Date.now()) },
    });
  }
}
