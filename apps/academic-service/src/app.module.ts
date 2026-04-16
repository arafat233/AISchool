import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { AcademicModule } from "./academic/academic.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AcademicModule] })
export class AppModule {}
