import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PayrollController } from "./payroll.controller";
import { SalaryStructureService } from "./salary-structure.service";
import { PayrollService } from "./payroll.service";
import { StatutoryService } from "./statutory.service";
import { GratuityService } from "./gratuity.service";
import { AdvanceService } from "./advance.service";
import { ExportService } from "./export.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [PayrollController],
  providers: [
    SalaryStructureService, PayrollService, StatutoryService,
    GratuityService, AdvanceService, ExportService, JwtStrategy,
  ],
})
export class PayrollModule {}
