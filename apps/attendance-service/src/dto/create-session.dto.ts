import { IsDateString, IsString } from "class-validator";
export class CreateSessionDto {
  @IsString() sectionId!: string;
  @IsDateString() date!: string;
}
