import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { ExamModule } from "./exam/exam.module";
import { OnlineExamModule } from "./online-exam/online-exam.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ExamModule, OnlineExamModule] })
export class AppModule {}
