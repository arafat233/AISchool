import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "@school-erp/database";
import { NotificationModule } from "./notification/notification.module";
import { NotificationCron } from "./cron/notification.cron";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    NotificationModule,
  ],
  providers: [NotificationCron],
})
export class AppModule {}
