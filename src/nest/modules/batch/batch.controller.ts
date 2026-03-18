import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";
import { BatchService } from "./batch.service";
import { ApiResponse } from "../../common/response";
import { IsString, IsNumber, IsOptional, Min, Max } from "class-validator";

class CreateBatchDto {
  @IsString()
  type: string;

  @IsNumber()
  @Min(1)
  @Max(200)
  count: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  artStyle?: string;
}

class BatchIdDto {
  @IsString()
  batchId: string;
}

@Controller("batch")
export class BatchController {
  constructor(private batchService: BatchService) {}

  @Post("create")
  async create(@Body() dto: CreateBatchDto) {
    const result = await this.batchService.createBatch(dto);
    return ApiResponse.success(result);
  }

  @Post("status")
  async status(@Body() dto: BatchIdDto) {
    const result = await this.batchService.getBatchStatus(dto.batchId);
    if (!result) throw new HttpException("批次不存在", HttpStatus.NOT_FOUND);
    return ApiResponse.success(result);
  }

  @Post("list")
  async list() {
    const result = await this.batchService.listBatches();
    return ApiResponse.success(result);
  }

  @Post("cancel")
  async cancel(@Body() dto: BatchIdDto) {
    await this.batchService.cancelBatch(dto.batchId);
    return ApiResponse.success({ message: "批次已取消" });
  }
}
