import { Controller, Post, Body } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { ApiResponse } from "../../common/response";
import { IsNumber, IsOptional } from "class-validator";

class ProjectIdDto {
  @IsOptional()
  @IsNumber()
  projectId?: number;
}

@Controller("metrics")
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Post("dashboard")
  async dashboard() {
    const result = await this.metricsService.getDashboard();
    return ApiResponse.success(result);
  }

  @Post("project")
  async projectMetrics(@Body() dto: ProjectIdDto) {
    if (!dto.projectId) return ApiResponse.error("projectId required");
    const result = await this.metricsService.getMetricsByProject(dto.projectId);
    return ApiResponse.success(result);
  }
}
