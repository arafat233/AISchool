import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "@school-erp/database";
import { ExamModule } from "./exam/exam.module";
import { OnlineExamModule } from "./online-exam/online-exam.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "burst",  ttl: 1_000,    limit: 10  },
      { name: "minute", ttl: 60_000,   limit: 60  },
      { name: "hour",   ttl: 3600_000, limit: 300 },
    ]),
    PrismaModule,
    ExamModule,
    OnlineExamModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
