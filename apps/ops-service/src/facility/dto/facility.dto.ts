import { IsString, IsOptional, IsNumber, IsDateString } from "class-validator";

export class SubmitFacilityRequestDto {
  @IsString()
  reportedBy: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}

export class CreatePreventiveScheduleDto {
  @IsString()
  taskName: string;

  @IsString()
  area: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class LogPestControlDto {
  @IsString()
  vendor: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsDateString()
  nextScheduled?: string;

  @IsOptional()
  @IsString()
  chemicalsUsed?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordHousekeepingInspectionDto {
  @IsString()
  inspectedBy: string;

  @IsString()
  area: string;

  @IsDateString()
  inspectionDate: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RecordUtilityBillDto {
  @IsString()
  utilityType: string;

  @IsOptional()
  @IsNumber()
  unitsConsumed?: number;

  @IsOptional()
  @IsNumber()
  amountRs?: number;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  meterReading?: string;
}

export class LogWasteDto {
  @IsString()
  wasteType: string;

  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsNumber()
  quantityKg?: number;

  @IsOptional()
  @IsString()
  disposalMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogWaterQualityDto {
  @IsString()
  source: string;

  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsNumber()
  phLevel?: number;

  @IsOptional()
  @IsNumber()
  turbidity?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  nextFilterDue?: string;
}

export class LogPoolQualityDto {
  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsNumber()
  phLevel?: number;

  @IsOptional()
  @IsNumber()
  chlorineLevel?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
