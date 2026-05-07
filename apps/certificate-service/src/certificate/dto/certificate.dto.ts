import { IsString, IsOptional, IsEnum, IsObject } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  htmlTemplate: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class CreateCertificateRequestDto {
  @IsString()
  certificateType: string;

  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class IssueCertificateDto {
  @IsString()
  certificateType: string;

  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}
