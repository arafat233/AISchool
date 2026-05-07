import { IsString, IsOptional, IsDateString, IsArray, IsNumber, IsBoolean, IsEmail, IsEnum, ValidateNested, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class QualificationDto {
  @IsString() degree: string;
  @IsString() institution: string;
  @IsOptional() @IsString() year?: string;
}

export class CreateStaffDto {
  @IsString() userId: string;
  @IsString() employeeCode: string;
  @IsString() designationId: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsDateString() joinDate: string;
  @IsOptional() @IsDateString() confirmationDate?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankIfsc?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() pfAccountNo?: string;
  @IsOptional() @IsString() esiNo?: string;
  @IsOptional() @IsString() panNo?: string;
  @IsOptional() @IsString() aadharNo?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QualificationDto) qualifications?: QualificationDto[];
}

export class UpdateStaffDto {
  @IsOptional() @IsString() employeeCode?: string;
  @IsOptional() @IsString() designationId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsDateString() confirmationDate?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankIfsc?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() pfAccountNo?: string;
  @IsOptional() @IsString() esiNo?: string;
  @IsOptional() @IsString() panNo?: string;
  @IsOptional() @IsString() aadharNo?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() bloodGroup?: string;
}

export class AddDocumentDto {
  @IsString() type: string;
  @IsString() fileUrl: string;
  @IsOptional() @IsString() verificationStatus?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}

export class CreateVacancyDto {
  @IsString() title: string;
  @IsString() designationId: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsNumber() openings?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() closingDate?: string;
}

export class UpdateVacancyDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsNumber() openings?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() closingDate?: string;
  @IsOptional() @IsString() status?: string;
}

export class ApplyVacancyDto {
  @IsString() applicantName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() resumeUrl?: string;
  @IsOptional() @IsString() coverLetterUrl?: string;
}

export class ScheduleInterviewDto {
  @IsDateString() scheduledAt: string;
  @IsString() interviewType: string;
  @IsOptional() @IsString() interviewerId?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() meetingLink?: string;
}

export class SubmitInterviewFeedbackDto {
  @IsString() interviewerId: string;
  @IsNumber() @Min(1) @Max(10) rating: number;
  @IsOptional() @IsString() strengths?: string;
  @IsOptional() @IsString() weaknesses?: string;
  @IsOptional() @IsString() recommendation?: string;
}

export class GenerateOfferDto {
  @IsDateString() joiningDate: string;
  @IsDateString() offerExpiry: string;
  @IsNumber() ctcAnnual: number;
  @IsOptional() @IsString() remarks?: string;
}

export class CreateLeavePolicyDto {
  @IsString() leaveType: string;
  @IsString() name: string;
  @IsNumber() annualAllowance: number;
  @IsOptional() @IsBoolean() isCarryForward?: boolean;
  @IsOptional() @IsNumber() maxCarryForward?: number;
  @IsOptional() @IsBoolean() isEncashable?: boolean;
}

export class UpdateLeavePolicyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() annualAllowance?: number;
  @IsOptional() @IsBoolean() isCarryForward?: boolean;
  @IsOptional() @IsNumber() maxCarryForward?: number;
  @IsOptional() @IsBoolean() isEncashable?: boolean;
}

export class ApplyLeaveDto {
  @IsString() staffId: string;
  @IsString() leaveTypeId: string;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() documentUrl?: string;
}

export class CreateTrainingDto {
  @IsString() title: string;
  @IsString() trainer: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsNumber() maxParticipants?: number;
  @IsOptional() @IsString() description?: string;
}

export class UpdateTrainingDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() trainer?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsNumber() maxParticipants?: number;
  @IsOptional() @IsString() status?: string;
}

export class SubmitResignationDto {
  @IsDateString() lastWorkingDate: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() noticePeriodWaiver?: string;
}

export class AddHandoverItemDto {
  @IsString() item: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() notes?: string;
}

export class AddNoDueItemDto {
  @IsString() department: string;
  @IsString() status: string;
  @IsOptional() @IsString() remarks?: string;
}

export class RecordFnFDto {
  @IsDateString() settledOn: string;
  @IsNumber() netPayable: number;
  @IsOptional() @IsString() paymentMode?: string;
  @IsOptional() @IsString() paymentRef?: string;
}

export class SubmitGrievanceDto {
  @IsString() category: string;
  @IsString() description: string;
  @IsOptional() @IsString() anonymous?: string;
}

export class CreateAppraisalDto {
  @IsString() staffId: string;
  @IsString() academicYearId: string;
  @IsOptional() @IsString() cycleType?: string;
}

export class BookSubstituteDto {
  @IsString() absentStaffId: string;
  @IsString() substituteStaffId: string;
  @IsDateString() date: string;
  @IsNumber() periodNo: number;
  @IsOptional() @IsString() subjectId?: string;
}

export class AddExternalSubstituteDto {
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() qualifications?: string;
  @IsOptional() @IsArray() subjects?: string[];
}
