import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";
import { JwtStrategy } from "../guards/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [StudentController],
  providers: [StudentService, JwtStrategy],
})
export class StudentModule {}
