import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { AIService } from "../ai/ai.service";
import { QueueService } from "../queue/queue.service";

@Processor("script")
@Injectable()
export class ScriptProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private ai: AIService,
    private queue: QueueService,
  ) {
    super();
  }

  async process(job: Job) {
    const { batchId, projectId, payload } = job.data;

    await job.updateProgress(10);

    // Update task status
    await this.prisma.pipelineTask.updateMany({
      where: { batchId, projectId, step: "script" },
      data: { status: "running", startedAt: BigInt(Date.now()) },
    });

    // Generate script
    const result = await this.ai.autoGenerateScript({
      promptText: payload.promptText || `生成一个${payload.style || "霸道总裁"}类型的30秒短视频剧本`,
      style: payload.style,
      maxRewrites: 2,
    });

    await job.updateProgress(70);

    // Save script
    await this.prisma.script.create({
      data: {
        projectId,
        content: result.content,
        version: 1,
        createTime: BigInt(Date.now()),
      },
    });

    // Update pipeline
    await this.prisma.pipelineTask.updateMany({
      where: { batchId, projectId, step: "script" },
      data: { status: "success", result: JSON.stringify({ accepted: result.accepted }), completedAt: BigInt(Date.now()) },
    });

    // Chain next step
    await this.queue.addTask("storyboard", { batchId, projectId, step: "storyboard", payload });

    await job.updateProgress(100);
    return { projectId, accepted: result.accepted };
  }
}
