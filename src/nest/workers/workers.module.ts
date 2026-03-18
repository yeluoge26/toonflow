import { Module } from "@nestjs/common";
import { ScriptProcessor } from "./script.processor";
import { ScoreProcessor } from "./score.processor";

@Module({
  providers: [ScriptProcessor, ScoreProcessor],
})
export class WorkersModule {}
