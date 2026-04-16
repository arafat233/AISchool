import { IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListStudentsQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sectionId?: string;
  @IsOptional() @IsString() gradeLevelId?: string;
}
