import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { FeeController } from "./fee.controller";
import { FeeService } from "./fee.service";
import { RazorpayService } from "../payment/razorpay.service";
import { JwtStrategy } from "../guards/jwt.strategy";
import { StudentEnrolledProcessor } from "../processors/student-enrolled.processor";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [FeeController],
  providers: [FeeService, RazorpayService, JwtStrategy, StudentEnrolledProcessor],
})
export class FeeModule {}
