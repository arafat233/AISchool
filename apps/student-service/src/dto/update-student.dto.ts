import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateStudentDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() sectionId?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsBoolean() transportRequired?: boolean;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}
