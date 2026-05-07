import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, Min, Max } from "class-validator";

export class CreateSchemeDto {
  @IsString() name: string;
  @IsString() type: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) amountRs?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() eligibilityCriteria?: any[];
}

export class UpdateSchemeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) amountRs?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() eligibilityCriteria?: any[];
}
