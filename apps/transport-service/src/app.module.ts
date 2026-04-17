import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { TransportModule } from "./transport/transport.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, TransportModule] })
export class AppModule {}
