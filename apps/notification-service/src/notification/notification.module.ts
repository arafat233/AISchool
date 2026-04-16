import { Module, OnModuleInit } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { SmsAdapter } from "../adapters/sms.adapter";
import { EmailAdapter } from "../adapters/email.adapter";
import { PushAdapter } from "../adapters/push.adapter";
import { WhatsappAdapter } from "../adapters/whatsapp.adapter";
import { NotificationProcessor } from "../processors/notification.processor";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [NotificationController],
  providers: [NotificationService, SmsAdapter, EmailAdapter, PushAdapter, WhatsappAdapter, NotificationProcessor, JwtStrategy],
})
export class NotificationModule implements OnModuleInit {
  constructor(private readonly processor: NotificationProcessor) {}
  onModuleInit() { this.processor.startWorker(); }
}
