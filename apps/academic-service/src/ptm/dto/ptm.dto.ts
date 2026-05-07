import { IsString, IsOptional, IsNumber, IsDateString, IsUUID } from "class-validator";

export class CreatePtmEventDto {
  @IsString()
  title: string;

  @IsDateString()
  eventDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  slotDurationMins?: number;
}

export class SetupSlotsDto {
  @IsUUID()
  staffId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class BookSlotDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
