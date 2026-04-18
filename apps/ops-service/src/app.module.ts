import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./guards/jwt.strategy";

import { AlumniController } from "./alumni/alumni.controller";
import { AlumniService } from "./alumni/alumni.service";
import { CommunityController } from "./community/community.controller";
import { CommunityService } from "./community/community.service";
import { FacilityController } from "./facility/facility.controller";
import { FacilityService } from "./facility/facility.service";
import { AssetController } from "./asset/asset.controller";
import { AssetService } from "./asset/asset.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PassportModule],
  controllers: [AlumniController, CommunityController, FacilityController, AssetController],
  providers: [AlumniService, CommunityService, FacilityService, AssetService, JwtStrategy],
})
export class AppModule {}
