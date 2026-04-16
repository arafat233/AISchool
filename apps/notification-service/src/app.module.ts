import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { NotificationModule } from "./notification/notification.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule] })
export class AppModule {}
