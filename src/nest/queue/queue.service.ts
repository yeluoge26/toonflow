import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue("script") private scriptQueue: Queue,
    @InjectQueue("storyboard") private storyboardQueue: Queue,
    @InjectQueue("image") private imageQueue: Queue,
    @InjectQueue("video") private videoQueue: Queue,
    @InjectQueue("voice") private voiceQueue: Queue,
    @InjectQueue("score") private scoreQueue: Queue,
  ) {}

  private getQueue(step: string): Queue {
    const map: Record<string, Queue> = {
      script: this.scriptQueue,
      storyboard: this.storyboardQueue,
      image: this.imageQueue,
      video: this.videoQueue,
      voice: this.voiceQueue,
      score: this.scoreQueue,
    };
    const queue = map[step];
    if (!queue) throw new Error(`Unknown queue: ${step}`);
    return queue;
  }

  async addTask(step: string, data: any, opts?: { priority?: number }) {
    const queue = this.getQueue(step);
    return queue.add(step, data, { priority: opts?.priority });
  }

  async addPipeline(batchId: string, projectId: number, payload: any = {}) {
    return this.addTask("script", { batchId, projectId, step: "script", payload });
  }

  async getStats() {
    const stats: Record<string, any> = {};
    for (const [name, queue] of Object.entries({
      script: this.scriptQueue,
      storyboard: this.storyboardQueue,
      image: this.imageQueue,
      video: this.videoQueue,
      voice: this.voiceQueue,
      score: this.scoreQueue,
    })) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      stats[name] = { waiting, active, completed, failed };
    }
    return stats;
  }

  async pauseQueue(step: string) { await this.getQueue(step).pause(); }
  async resumeQueue(step: string) { await this.getQueue(step).resume(); }
}
