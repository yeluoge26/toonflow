import { Module } from "@nestjs/common";
import { ScoreController } from "./score.controller";
import { ScoreService } from "./score.service";

@Module({
  controllers: [ScoreController],
  providers: [ScoreService],
  exports: [ScoreService],
})
export class ScoreModule {}
