import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsArray, IsEnum } from "class-validator";

export class UpsertMedicalProfileDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsArray()
  allergies?: string[];

  @IsOptional()
  @IsArray()
  chronicConditions?: string[];

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  doctorPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogNurseVisitDto {
  @IsUUID()
  studentId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogMedicationDto {
  @IsUUID()
  studentId: string;

  @IsString()
  medicationName: string;

  @IsString()
  dose: string;

  @IsDateString()
  scheduledTime: string;

  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportIncidentDto {
  @IsUUID()
  studentId: string;

  @IsString()
  incidentType: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;
}

export class AddVaccinationDto {
  @IsString()
  vaccineName: string;

  @IsOptional()
  @IsDateString()
  administeredOn?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordFitnessDto {
  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  bmi?: number;

  @IsOptional()
  @IsNumber()
  runTimeSecs?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAedDto {
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  padExpiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCounsellingSessionDto {
  @IsUUID()
  studentId: string;

  @IsString()
  sessionType: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextSession?: string;
}

export class RecordDisciplineDto {
  @IsUUID()
  studentId: string;

  @IsString()
  incidentType: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsString()
  parentNotified?: string;
}
