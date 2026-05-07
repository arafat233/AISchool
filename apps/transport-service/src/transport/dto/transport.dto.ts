import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsBoolean } from "class-validator";

export class CreateRouteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startPoint?: string;

  @IsOptional()
  @IsString()
  endPoint?: string;
}

export class AddStopDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  sequenceNo?: number;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;

  @IsOptional()
  @IsString()
  estimatedTime?: string;
}

export class UpdateStopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  sequenceNo?: number;

  @IsOptional()
  @IsString()
  estimatedTime?: string;
}

export class CreateVehicleDto {
  @IsString()
  registrationNo: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsDateString()
  fitnessExpiry?: string;

  @IsOptional()
  @IsDateString()
  pucExpiry?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsDateString()
  fitnessExpiry?: string;

  @IsOptional()
  @IsDateString()
  pucExpiry?: string;
}

export class AddMaintenanceDto {
  @IsString()
  serviceType: string;

  @IsDateString()
  serviceDate: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsNumber()
  costRs?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  licenceNo?: string;

  @IsOptional()
  @IsDateString()
  licenceExpiry?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignStudentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  routeId: string;

  @IsOptional()
  @IsString()
  stopId?: string;

  @IsOptional()
  @IsString()
  pickupTime?: string;

  @IsOptional()
  @IsString()
  dropTime?: string;
}

export class StartTripDto {
  @IsUUID()
  routeId: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
