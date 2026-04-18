import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../guards/jwt.strategy";
import { ScholarshipController } from "./scholarship.controller";
import { ScholarshipService } from "./scholarship.service";

@Module({
  imports: [PassportModule],
  controllers: [ScholarshipController],
  providers: [ScholarshipService, JwtStrategy],
})
export class ScholarshipModule {}
