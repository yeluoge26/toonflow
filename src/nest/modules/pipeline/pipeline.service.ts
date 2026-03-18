import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async updateTaskStatus(taskId: string, status: string, result?: any, errorMsg?: string) {
    return this.prisma.pipelineTask.update({
      where: { taskId },
      data: {
        status,
        result: result ? JSON.stringify(result) : undefined,
        errorMsg,
        ...(status === "running" ? { startedAt: BigInt(Date.now()) } : {}),
        ...(["success", "failed"].includes(status) ? { completedAt: BigInt(Date.now()) } : {}),
      },
    });
  }

  async getTasksByBatch(batchId: string) {
    return this.prisma.pipelineTask.findMany({
      where: { batchId },
      orderBy: [{ projectId: "asc" }, { createdAt: "asc" }],
    });
  }

  async getFailedTasks(batchId?: string) {
    return this.prisma.pipelineTask.findMany({
      where: { status: "failed", ...(batchId ? { batchId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async retryTask(taskId: string) {
    const task = await this.prisma.pipelineTask.findUnique({ where: { taskId } });
    if (!task) return null;

    await this.prisma.pipelineTask.update({
      where: { taskId },
      data: { status: "pending", errorMsg: null, retryCount: { increment: 1 } },
    });
    return task;
  }
}
