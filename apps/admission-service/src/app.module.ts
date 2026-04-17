import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { AdmissionModule } from "./admission/admission.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AdmissionModule] })
export class AppModule {}
