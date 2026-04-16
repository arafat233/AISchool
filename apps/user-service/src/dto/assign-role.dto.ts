import { IsEnum } from "class-validator";
import { UserRole } from "@school-erp/types";

export class AssignRoleDto {
  @IsEnum(UserRole) role!: UserRole;
}
