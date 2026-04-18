import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { ScholarshipModule } from "./scholarship/scholarship.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ScholarshipModule] })
export class AppModule {}
