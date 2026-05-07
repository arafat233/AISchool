import { IsString, IsOptional, IsNumber, IsDateString } from "class-validator";

export class RegisterAssetDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsNumber()
  purchasePriceRs?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  serialNo?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  depreciationRatePct?: number;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogAssetMaintenanceDto {
  @IsString()
  serviceType: string;

  @IsDateString()
  serviceDate: string;

  @IsOptional()
  @IsDateString()
  nextServiceDue?: string;

  @IsOptional()
  @IsNumber()
  costRs?: number;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInsurancePolicyDto {
  @IsString()
  provider: string;

  @IsString()
  policyNo: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsNumber()
  premiumRs?: number;

  @IsOptional()
  @IsNumber()
  coverageAmtRs?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
