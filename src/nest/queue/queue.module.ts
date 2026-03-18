import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";

const QUEUE_NAMES = ["script", "storyboard", "image", "video", "voice", "score"];

@Global()
@Module({
  imports: [
    ...QUEUE_NAMES.map(name =>
      BullModule.registerQueue({
        name,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      })
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
