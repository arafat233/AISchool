import { IsString, IsOptional, IsNumber, IsBoolean } from "class-validator";

export class CreateSalaryComponentDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsBoolean()
  isPercentage?: boolean;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSalaryComponentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsBoolean()
  isPercentage?: boolean;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;
}

export class CreatePayrollRunDto {
  @IsNumber()
  month: number;

  @IsNumber()
  year: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequestAdvanceDto {
  @IsString()
  staffId: string;

  @IsNumber()
  amountRs: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  repaymentMonths?: number;
}
