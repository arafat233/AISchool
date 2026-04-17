import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { LibraryModule } from "./library/library.module";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, LibraryModule] })
export class AppModule {}
