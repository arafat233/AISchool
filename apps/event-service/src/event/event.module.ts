import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../guards/jwt.strategy";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";

@Module({
  imports: [PassportModule],
  controllers: [EventController],
  providers: [EventService, JwtStrategy],
})
export class EventModule {}
