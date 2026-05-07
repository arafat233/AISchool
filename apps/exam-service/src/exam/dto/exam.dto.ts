import { IsString, IsOptional, IsNumber, IsDateString, IsArray, IsUUID } from "class-validator";

export class CreateExamScheduleDto {
  @IsUUID()
  subjectId: string;

  @IsDateString()
  examDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  maxMarks?: number;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  classId?: string;
}

export class ApplyGraceDto {
  @IsOptional()
  @IsNumber()
  graceMarks?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  subjectIds?: string[];
}

export class UpsertGracePolicyDto {
  @IsOptional()
  @IsNumber()
  maxGracePerSubject?: number;

  @IsOptional()
  @IsNumber()
  maxGraceTotal?: number;

  @IsOptional()
  @IsString()
  applicableCondition?: string;
}

export class UpsertGradingConfigDto {
  @IsArray()
  grades: Array<{
    grade: string;
    minPercent: number;
    maxPercent: number;
    gradePoint?: number;
    description?: string;
  }>;

  @IsOptional()
  @IsString()
  gradingType?: string;
}
