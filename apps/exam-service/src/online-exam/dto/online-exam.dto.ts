import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, IsUUID } from "class-validator";

export class CreateQuestionDto {
  @IsString()
  type: string;

  @IsString()
  questionText: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  bloomLevel?: string;

  @IsOptional()
  @IsArray()
  options?: Array<{ text: string; isCorrect: boolean }>;

  @IsOptional()
  @IsString()
  correctAnswerText?: string;

  @IsOptional()
  @IsNumber()
  marks?: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  bloomLevel?: string;

  @IsOptional()
  @IsArray()
  options?: Array<{ text: string; isCorrect: boolean }>;

  @IsOptional()
  @IsString()
  correctAnswerText?: string;

  @IsOptional()
  @IsNumber()
  marks?: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CreateOnlineTestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  totalMarks?: number;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;
}

export class SaveAnswerDto {
  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsBoolean()
  isMarkedForReview?: boolean;
}

export class SubmitManualScoreDto {
  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
