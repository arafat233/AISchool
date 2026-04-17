import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { CertificateController, VerifyController } from "./certificate.controller";
import { CertificateService } from "./certificate.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [CertificateController, VerifyController],
  providers: [CertificateService, JwtStrategy],
})
export class CertificateModule {}
