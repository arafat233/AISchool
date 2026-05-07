import { IsString, IsOptional, IsObject, IsArray } from "class-validator";

export class CreateNotificationTemplateDto {
  @IsString()
  name: string;

  @IsString()
  channel: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
