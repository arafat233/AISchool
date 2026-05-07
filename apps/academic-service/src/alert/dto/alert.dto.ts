import { IsString, IsOptional, IsEnum } from "class-validator";

export class BroadcastAlertDto {
  @IsString()
  message: string;

  @IsString()
  alertType: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
