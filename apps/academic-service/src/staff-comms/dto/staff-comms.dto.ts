import { IsString, IsOptional, IsArray } from "class-validator";

export class PublishCircularDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsArray()
  attachmentUrls?: string[];

  @IsOptional()
  @IsString()
  priority?: string;
}
