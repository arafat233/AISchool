import { Module } from "@nestjs/common";
import { PrismaModule } from "@school-erp/database";
import { CafeteriaController } from "./cafeteria.controller";
import { CafeteriaService } from "./cafeteria.service";

@Module({
  imports: [PrismaModule],
  controllers: [CafeteriaController],
  providers: [CafeteriaService],
})
export class CafeteriaModule {}
