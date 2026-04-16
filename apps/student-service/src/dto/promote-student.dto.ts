import { IsArray, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class PromotionItem {
  @IsString() studentId!: string;
  @IsString() fromSectionId!: string;
  @IsString() newSectionId!: string;
}

export class PromoteStudentDto {
  @IsString() currentAcademicYearId!: string;
  @IsString() newAcademicYearId!: string;
  @IsString() promotedById!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PromotionItem) promotions!: PromotionItem[];
}
