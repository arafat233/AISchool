import { Module } from "@nestjs/common";
import { StaffCommsController } from "./staff-comms.controller";
import { StaffCommsService } from "./staff-comms.service";

@Module({ controllers: [StaffCommsController], providers: [StaffCommsService] })
export class StaffCommsModule {}
