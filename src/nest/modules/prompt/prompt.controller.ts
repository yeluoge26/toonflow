import { Controller, Post, Body } from "@nestjs/common";
import { PromptService } from "./prompt.service";
import { ApiResponse } from "../../common/response";
import { IsNumber, IsOptional } from "class-validator";

class InitDto {
  @IsOptional()
  @IsNumber()
  count?: number;
}

class EvolveDto {
  @IsOptional()
  @IsNumber()
  mutationRate?: number;
}

@Controller("prompt")
export class PromptController {
  constructor(private promptService: PromptService) {}

  @Post("population")
  async getPopulation() {
    const population = await this.promptService.getPopulation();
    return ApiResponse.success({ count: population.length, genomes: population });
  }

  @Post("init")
  async init(@Body() dto: InitDto) {
    const result = await this.promptService.initPopulation(dto.count || 100);
    return ApiResponse.success({ count: result.length });
  }

  @Post("evolve")
  async evolve(@Body() dto: EvolveDto) {
    const result = await this.promptService.evolve(dto.mutationRate);
    return ApiResponse.success(result);
  }
}
