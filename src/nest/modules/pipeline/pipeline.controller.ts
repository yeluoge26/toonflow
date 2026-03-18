import { Controller, Post, Body } from "@nestjs/common";
import { PipelineService } from "./pipeline.service";
import { ApiResponse } from "../../common/response";
import { IsString, IsOptional } from "class-validator";

class BatchIdDto {
  @IsOptional()
  @IsString()
  batchId?: string;
}

class TaskIdDto {
  @IsString()
  taskId: string;
}

@Controller("pipeline")
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Post("tasks")
  async getTasks(@Body() dto: BatchIdDto) {
    if (!dto.batchId) return ApiResponse.error("batchId required");
    const tasks = await this.pipelineService.getTasksByBatch(dto.batchId);
    return ApiResponse.success(tasks);
  }

  @Post("failed")
  async getFailed(@Body() dto: BatchIdDto) {
    const tasks = await this.pipelineService.getFailedTasks(dto.batchId);
    return ApiResponse.success(tasks);
  }

  @Post("retry")
  async retry(@Body() dto: TaskIdDto) {
    const task = await this.pipelineService.retryTask(dto.taskId);
    return ApiResponse.success(task ? { message: "任务已重新排队" } : { message: "任务不存在" });
  }
}
