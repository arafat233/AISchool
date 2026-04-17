import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@school-erp/database";
import { AcademicModule } from "./academic/academic.module";
import { HomeworkModule } from "./homework/homework.module";
import { SurveyModule } from "./survey/survey.module";
import { PtmModule } from "./ptm/ptm.module";
import { CalendarModule } from "./calendar/calendar.module";
import { AlertModule } from "./alert/alert.module";
import { StaffCommsModule } from "./staff-comms/staff-comms.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AcademicModule,
    HomeworkModule,
    SurveyModule,
    PtmModule,
    CalendarModule,
    AlertModule,
    StaffCommsModule,
  ],
})
export class AppModule {}
