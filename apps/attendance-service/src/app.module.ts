import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { AttendanceModule } from "./attendance/attendance.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AttendanceModule] })
export class AppModule {}
