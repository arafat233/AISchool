import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { LmsModule } from "./lms/lms.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, LmsModule] })
export class AppModule {}
