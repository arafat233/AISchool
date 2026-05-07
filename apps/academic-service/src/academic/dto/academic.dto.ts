import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsBoolean } from "class-validator";

export class CreateAcademicYearDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class CreateGradeLevelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateSectionDto {
  @IsString()
  name: string;

  @IsUUID()
  gradeLevelId: string;

  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsUUID()
  classTeacherId?: string;
}

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isElective?: boolean;
}

export class AssignSubjectDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;
}

export class CreateTimetableSlotDto {
  @IsUUID()
  sectionId: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  academicYearId: string;

  @IsString()
  dayOfWeek: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  room?: string;
}
