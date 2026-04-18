import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./guards/jwt.strategy";
import { ReportController } from "./report/report.controller";
import { ReportService } from "./report/report.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PassportModule],
  controllers: [ReportController],
  providers: [ReportService, JwtStrategy],
})
export class AppModule {}
