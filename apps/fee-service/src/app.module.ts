import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { FeeModule } from "./fee/fee.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, FeeModule] })
export class AppModule {}
