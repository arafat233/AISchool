import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { OnlineExamController } from "./online-exam.controller";
import { QuestionBankService } from "./question-bank.service";
import { TestBuilderService } from "./test-builder.service";
import { TestDeliveryService } from "./test-delivery.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [OnlineExamController],
  providers: [QuestionBankService, TestBuilderService, TestDeliveryService, JwtStrategy],
})
export class OnlineExamModule {}
