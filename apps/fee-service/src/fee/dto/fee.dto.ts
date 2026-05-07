import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateFeeHeadDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateFeeStructureDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsArray()
  components?: Array<{ feeHeadId: string; amountRs: number; term?: string }>;
}

export class RecordCashPaymentDto {
  @IsNumber()
  amountRs: number;

  @IsOptional()
  @IsString()
  receiptNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyOnlinePaymentDto {
  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpaySignature: string;
}

export class ApplyConcessionDto {
  @IsNumber()
  concessionAmtRs: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  concessionType?: string;
}
