import { IsString, IsOptional, IsArray, IsObject } from "class-validator";

export class CustomReportDto {
  @IsString()
  reportType: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsArray()
  fields?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
