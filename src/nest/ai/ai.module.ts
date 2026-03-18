import { Module, Global } from "@nestjs/common";
import { AIService } from "./ai.service";

@Global()
@Module({
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
