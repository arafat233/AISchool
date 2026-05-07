import { IsString, IsOptional, IsDateString, IsBoolean, IsUUID } from "class-validator";

export class UpdateHomeworkDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsBoolean()
  requiresAcknowledgement?: boolean;
}
