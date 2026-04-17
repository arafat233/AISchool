import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { HrModule } from "./hr/hr.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, HrModule] })
export class AppModule {}
