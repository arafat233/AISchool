import { IsString, IsOptional, IsNumber, IsArray, IsDateString, IsBoolean, Min } from "class-validator";

export class RecordExpenseDto {
  @IsString() recordedBy: string;
  @IsString() type: string;
  @IsString() description: string;
  @IsNumber() @Min(0) amountRs: number;
  @IsDateString() paymentDate: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() paymentMode?: string;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsNumber() gstRatePercent?: number;
  @IsOptional() @IsBoolean() itcEligible?: boolean;
}

export class CreatePODto {
  @IsString() createdBy: string;
  @IsString() vendorId: string;
  @IsString() department: string;
  @IsString() description: string;
  @IsOptional() @IsDateString() requiredBy?: string;
  @IsOptional() @IsArray() items?: any[];
}

export class CreateVendorDto {
  @IsString() name: string;
  @IsString() category: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() gstNo?: string;
  @IsOptional() @IsString() panNo?: string;
  @IsOptional() @IsNumber() tdsRatePercent?: number;
}

export class UpdateVendorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() gstNo?: string;
  @IsOptional() @IsNumber() tdsRatePercent?: number;
}

export class ImportBankStatementDto {
  @IsString() accountNo: string;
  @IsString() bankName: string;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsOptional() @IsArray() transactions?: any[];
}

export class RecordRevenueDto {
  @IsString() source: string;
  @IsNumber() @Min(0) amountRs: number;
  @IsDateString() recognitionDate: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() deferralEndDate?: string;
  @IsOptional() @IsString() referenceId?: string;
}

export class SubmitVendorInvoiceDto {
  @IsString() invoiceNo: string;
  @IsDateString() invoiceDate: string;
  @IsNumber() @Min(0) amountRs: number;
  @IsOptional() @IsString() invoiceUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() lineItems?: any[];
}
