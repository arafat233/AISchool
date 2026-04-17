import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { HomeworkController } from "./homework.controller";
import { HomeworkService } from "./homework.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [HomeworkController],
  providers: [HomeworkService, JwtStrategy],
})
export class HomeworkModule {}
