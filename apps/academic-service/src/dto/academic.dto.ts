import { IsString, IsOptional, IsNumber, IsArray, IsDateString, IsEmail, Min, Max } from "class-validator";

// ─── Cafeteria ────────────────────────────────────────────────────────────────

export class CreateMenuItemDto {
  @IsString() name: string;
  @IsString() mealType: string;
  @IsNumber() priceRs: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() allergens?: string[];
  @IsOptional() @IsNumber() calories?: number;
  @IsOptional() @IsString() imageUrl?: string;
}

export class UpsertFssaiDto {
  @IsString() licenseNo: string;
  @IsDateString() expiryDate: string;
  @IsOptional() @IsString() licenseUrl?: string;
  @IsOptional() @IsString() category?: string;
}

export class AddFssaiStaffCertDto {
  @IsString() staffId: string;
  @IsString() certNo: string;
  @IsDateString() expiryDate: string;
  @IsOptional() @IsString() certUrl?: string;
}

export class LogFoodSampleDto {
  @IsString() menuItemId: string;
  @IsString() sampledBy: string;
  @IsDateString() sampleDate: string;
  @IsDateString() retainedUntil: string;
  @IsOptional() @IsString() batchNo?: string;
  @IsOptional() @IsString() storageLocation?: string;
}

// ─── Survey ───────────────────────────────────────────────────────────────────

export class CreateSurveyDto {
  @IsString() title: string;
  @IsString() type: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsArray() targetRoles?: string[];
}

export class AddQuestionDto {
  @IsString() questionText: string;
  @IsString() questionType: string;
  @IsOptional() @IsArray() options?: string[];
  @IsOptional() @IsNumber() orderNo?: number;
  @IsOptional() required?: boolean;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() questionText?: string;
  @IsOptional() @IsString() questionType?: string;
  @IsOptional() @IsArray() options?: string[];
  @IsOptional() @IsNumber() orderNo?: number;
  @IsOptional() required?: boolean;
}

// ─── Visitor ──────────────────────────────────────────────────────────────────

export class RegisterVisitorDto {
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() idType?: string;
  @IsOptional() @IsString() idNo?: string;
  @IsString() purposeOfVisit: string;
  @IsOptional() @IsString() personToMeet?: string;
  @IsOptional() @IsString() vehicleNo?: string;
  @IsOptional() @IsString() photoUrl?: string;
}

export class RequestGatePassDto {
  @IsString() studentId: string;
  @IsString() reason: string;
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsDateString() expectedReturnTime?: string;
}

export class LogDeliveryDto {
  @IsString() deliveredBy: string;
  @IsOptional() @IsString() recipientStudentId?: string;
  @IsOptional() @IsString() recipientName?: string;
  @IsString() description: string;
  @IsOptional() @IsString() trackingNo?: string;
}
