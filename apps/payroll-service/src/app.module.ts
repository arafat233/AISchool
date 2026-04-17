import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { PayrollModule } from "./payroll/payroll.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PayrollModule] })
export class AppModule {}
