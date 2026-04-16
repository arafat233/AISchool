import { IsString, Length } from "class-validator";

export class SetupTotpVerifyDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
