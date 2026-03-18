import { Job } from "bullmq";
import {
  scriptQueue,
  storyboardQueue,
  imageQueue,
  videoQueue,
  voiceQueue,
  scoreQueue,
  allQueues,
  QueueStep,
} from "../queue/queues";

export interface PipelineJobData {
  batchId: string;
  projectId: number;
  step: QueueStep;
  payload: Record<string, any>;
}

export class QueueService {
  // Submit a single task to the appropriate queue
  static async addTask(step: QueueStep, data: PipelineJobData, opts?: { priority?: number }) {
    const queue = allQueues[step];
    if (!queue) throw new Error(`Unknown queue step: ${step}`);

    const job = await queue.add(step, data, {
      priority: opts?.priority,
      jobId: `${data.batchId}_${data.projectId}_${step}`,
    });

    return { jobId: job.id, step, batchId: data.batchId };
  }

  // Submit a full pipeline (script → storyboard → image → video → voice → score)
  // Only script is submitted initially; subsequent steps are triggered by workers
  static async addPipeline(batchId: string, projectId: number, payload: Record<string, any> = {}, priority?: number) {
    return this.addTask("script", {
      batchId,
      projectId,
      step: "script",
      payload,
    }, { priority });
  }

  // Get job status
  static async getJobStatus(step: QueueStep, jobId: string) {
    const queue = allQueues[step];
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      step,
      state,
      progress: job.progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    };
  }

  // Get queue stats for monitoring
  static async getQueueStats() {
    const stats: Record<string, any> = {};

    for (const [name, queue] of Object.entries(allQueues)) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats[name] = { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
    }

    return stats;
  }

  // Pause/resume a queue
  static async pauseQueue(step: QueueStep) {
    await allQueues[step].pause();
  }

  static async resumeQueue(step: QueueStep) {
    await allQueues[step].resume();
  }

  // Clean old jobs
  static async cleanQueue(step: QueueStep, gracePeriod: number = 3600000) {
    const queue = allQueues[step];
    await queue.clean(gracePeriod, 1000, "completed");
    await queue.clean(gracePeriod, 1000, "failed");
  }
}
