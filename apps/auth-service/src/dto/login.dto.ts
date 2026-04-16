import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}
