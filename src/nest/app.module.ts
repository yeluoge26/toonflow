import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "./database/database.module";
import { QueueModule } from "./queue/queue.module";
import { BatchModule } from "./modules/batch/batch.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { ScoreModule } from "./modules/score/score.module";
import { PromptModule } from "./modules/prompt/prompt.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { AIModule } from "./ai/ai.module";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    }),
    DatabaseModule,
    QueueModule,
    BatchModule,
    PipelineModule,
    ScoreModule,
    PromptModule,
    MetricsModule,
    AIModule,
  ],
})
export class AppModule {}
