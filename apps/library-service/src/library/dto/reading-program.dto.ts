import { IsString, IsOptional, IsNumber, IsDateString, IsUUID } from "class-validator";

export class CreateReadingProgramDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  targetBooksCount?: number;

  @IsOptional()
  @IsNumber()
  targetPagesCount?: number;
}

export class LogReadingEntryDto {
  @IsUUID()
  studentId: string;

  @IsString()
  bookTitle: string;

  @IsOptional()
  @IsString()
  bookId?: string;

  @IsOptional()
  @IsNumber()
  pagesRead?: number;

  @IsOptional()
  @IsNumber()
  minutesRead?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  readDate?: string;
}
