import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { ExamModule } from "./exam/exam.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ExamModule] })
export class AppModule {}
