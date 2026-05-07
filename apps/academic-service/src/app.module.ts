import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "@school-erp/database";
import { AcademicModule } from "./academic/academic.module";
import { HomeworkModule } from "./homework/homework.module";
import { SurveyModule } from "./survey/survey.module";
import { PtmModule } from "./ptm/ptm.module";
import { CalendarModule } from "./calendar/calendar.module";
import { AlertModule } from "./alert/alert.module";
import { StaffCommsModule } from "./staff-comms/staff-comms.module";
import { VisitorModule } from "./visitor/visitor.module";
import { CafeteriaModule } from "./cafeteria/cafeteria.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "burst",  ttl: 1_000,    limit: 10  },
      { name: "minute", ttl: 60_000,   limit: 60  },
      { name: "hour",   ttl: 3600_000, limit: 300 },
    ]),
    PrismaModule,
    AcademicModule,
    HomeworkModule,
    SurveyModule,
    PtmModule,
    CalendarModule,
    AlertModule,
    StaffCommsModule,
    VisitorModule,
    CafeteriaModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
