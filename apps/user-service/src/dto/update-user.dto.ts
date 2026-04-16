import { IsDateString, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";

export class UpdateUserDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsUrl() avatarUrl?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(["MALE", "FEMALE", "OTHER"]) gender?: string;
  @IsOptional() @IsString() address?: string;
}
