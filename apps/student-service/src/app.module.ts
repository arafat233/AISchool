import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { StudentModule } from "./student/student.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, StudentModule],
})
export class AppModule {}
