import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { CertificateModule } from "./certificate/certificate.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CertificateModule] })
export class AppModule {}
