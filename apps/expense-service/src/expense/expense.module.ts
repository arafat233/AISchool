import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../guards/jwt.strategy";
import { ExpenseController } from "./expense.controller";
import { ExpenseService } from "./expense.service";

@Module({
  imports: [PassportModule],
  controllers: [ExpenseController],
  providers: [ExpenseService, JwtStrategy],
})
export class ExpenseModule {}
