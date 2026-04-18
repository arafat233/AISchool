import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { EventModule } from "./event/event.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventModule] })
export class AppModule {}
