import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString() @IsNotEmpty() admissionNo!: string;
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsDateString() dateOfBirth!: string;
  @IsEnum(["MALE", "FEMALE", "OTHER"]) gender!: string;
  @IsString() sectionId!: string;
  @IsString() academicYearId!: string;
  @IsOptional() @IsDateString() admissionDate?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() religion?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() motherTongue?: string;
  @IsOptional() @IsString() aadharNo?: string;
  @IsOptional() @IsBoolean() isRTE?: boolean;
  @IsOptional() @IsBoolean() transportRequired?: boolean;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}
