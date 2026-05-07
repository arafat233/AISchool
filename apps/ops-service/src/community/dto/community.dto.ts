import { IsString, IsOptional, IsNumber, IsDateString, IsUUID } from "class-validator";

export class AddPtaMemberDto {
  @IsString()
  parentId: string;

  @IsString()
  role: string;

  @IsDateString()
  electedAt: string;

  @IsOptional()
  @IsDateString()
  tenureEndAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePtaMeetingDto {
  @IsString()
  createdBy: string;

  @IsString()
  title: string;

  @IsDateString()
  meetingDate: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  agenda?: string;
}

export class UpdatePtaMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  meetingDate?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  minutes?: string;
}

export class RecordPtaFundEntryDto {
  @IsString()
  type: string;

  @IsNumber()
  amountRs: number;

  @IsDateString()
  entryDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;
}

export class CreateVolunteerOpportunityDto {
  @IsString()
  createdBy: string;

  @IsString()
  title: string;

  @IsDateString()
  opportunityDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  slotsAvailable?: number;
}

export class LogCommunityServiceDto {
  @IsUUID()
  studentId: string;

  @IsString()
  activityName: string;

  @IsDateString()
  activityDate: string;

  @IsNumber()
  hoursSpent: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePartnerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  mouStartDate?: string;

  @IsOptional()
  @IsDateString()
  mouEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogCsrActivityDto {
  @IsString()
  activityName: string;

  @IsDateString()
  activityDate: string;

  @IsOptional()
  @IsNumber()
  budgetRs?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  studentsImpacted?: number;
}

export class LogFoundItemDto {
  @IsString()
  reportedBy: string;

  @IsString()
  itemDescription: string;

  @IsDateString()
  foundAt: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  priceRs: number;

  @IsNumber()
  stockQty: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PlaceOrderDto {
  @IsString()
  studentId: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  items?: Array<{ productId: string; qty: number }>;
}

export class CreateCallTemplateDto {
  @IsString()
  name: string;

  @IsString()
  script: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class CreateSignageContentDto {
  @IsString()
  createdBy: string;

  @IsString()
  title: string;

  @IsString()
  contentType: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsString()
  contentUrl?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;
}
