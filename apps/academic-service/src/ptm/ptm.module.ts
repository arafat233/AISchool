import { Module } from "@nestjs/common";
import { PtmController } from "./ptm.controller";
import { PtmService } from "./ptm.service";

@Module({ controllers: [PtmController], providers: [PtmService] })
export class PtmModule {}
