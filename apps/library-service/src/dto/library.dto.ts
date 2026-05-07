import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsUrl, Min } from "class-validator";

export class CreateBookDto {
  @IsString() title: string;
  @IsString() author: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsNumber() publishYear?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsNumber() @Min(0) totalCopies?: number;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() isbn?: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsNumber() publishYear?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsNumber() @Min(0) totalCopies?: number;
  @IsOptional() @IsString() shelfLocation?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
}

export class CreateEBookDto {
  @IsString() title: string;
  @IsString() author: string;
  @IsString() fileUrl: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() gradeLevel?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() coverImageUrl?: string;
}

export class CreatePeriodicalDto {
  @IsString() title: string;
  @IsString() type: string;
  @IsOptional() @IsString() publisher?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() language?: string;
}

export class RecordPeriodicalIssueDto {
  @IsString() issueDate: string;
  @IsOptional() @IsString() volume?: string;
  @IsOptional() @IsString() issueNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SuggestBookDto {
  @IsString() suggestedBy: string;
  @IsString() memberRole: string;
  @IsString() title: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsString() reason?: string;
}
