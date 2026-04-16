import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AttendanceRecordDto {
  @IsString() studentId!: string;
  @IsEnum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"]) status!: string;
  @IsOptional() @IsString() remark?: string;
}

export class BulkAttendanceDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttendanceRecordDto) records!: AttendanceRecordDto[];
}
