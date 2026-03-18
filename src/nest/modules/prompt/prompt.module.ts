import { Module } from "@nestjs/common";
import { PromptController } from "./prompt.controller";
import { PromptService } from "./prompt.service";

@Module({
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
