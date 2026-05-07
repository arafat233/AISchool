import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
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
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "burst",  ttl: 1_000,    limit: 10  },
      { name: "minute", ttl: 60_000,   limit: 60  },
      { name: "hour",   ttl: 3600_000, limit: 300 },
    ]),
    PrismaModule,
    PassportModule,
  ],
  controllers: [AlumniController, CommunityController, FacilityController, AssetController],
  providers: [AlumniService, CommunityService, FacilityService, AssetService, JwtStrategy, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
