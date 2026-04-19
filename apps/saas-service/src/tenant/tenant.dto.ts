import { IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export enum SubscriptionPlan { BASIC = "BASIC", STANDARD = "STANDARD", PREMIUM = "PREMIUM", ENTERPRISE = "ENTERPRISE" }
export enum TenantStatus { TRIAL = "TRIAL", ACTIVE = "ACTIVE", SUSPENDED = "SUSPENDED", CHURNED = "CHURNED" }

export class CreateTenantDto {
  @IsString() name: string;
  @IsEmail() contactEmail: string;
  @IsString() @IsOptional() contactPhone?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() state?: string;
  @IsEnum(SubscriptionPlan) @IsOptional() plan?: SubscriptionPlan;
}

export class UpdateTenantDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() contactEmail?: string;
  @IsEnum(SubscriptionPlan) @IsOptional() plan?: SubscriptionPlan;
  @IsEnum(TenantStatus) @IsOptional() status?: TenantStatus;
}

export class ChangePlanDto {
  @IsEnum(SubscriptionPlan) plan: SubscriptionPlan;
}

export class UpdateStatusDto {
  @IsIn(["TRIAL","ACTIVE","SUSPENDED","SUSPENDED","CHURNED"]) status: TenantStatus;
  @IsString() @IsOptional() reason?: string;
}
