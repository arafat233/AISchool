import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { ExpenseModule } from "./expense/expense.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ExpenseModule] })
export class AppModule {}
