import { Controller, Post, Body } from "@nestjs/common";
import { ScoreService } from "./score.service";
import { ApiResponse } from "../../common/response";
import { IsNumber, IsOptional, IsString } from "class-validator";

class ScoreProjectDto {
  @IsNumber()
  projectId: number;
}

class GetScoresDto {
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

class SubmitMetricsDto {
  @IsNumber()
  projectId: number;

  @IsString()
  platform: string;

  @IsNumber()
  views: number;

  @IsNumber()
  likes: number;

  @IsOptional()
  @IsNumber()
  comments?: number;

  @IsOptional()
  @IsNumber()
  shares?: number;

  @IsOptional()
  @IsNumber()
  completionRate?: number;
}

@Controller("score")
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  @Post("project")
  async score(@Body() dto: ScoreProjectDto) {
    const result = await this.scoreService.scoreProject(dto.projectId);
    const action = await this.scoreService.getAutoFilterDecision(result.finalScore);
    return ApiResponse.success({ ...result, action });
  }

  @Post("list")
  async list(@Body() dto: GetScoresDto) {
    const scores = await this.scoreService.getScores(dto);
    return ApiResponse.success(scores);
  }

  @Post("metrics")
  async submitMetrics(@Body() dto: SubmitMetricsDto) {
    const result = await this.scoreService.submitMetrics(dto);
    return ApiResponse.success(result);
  }
}
