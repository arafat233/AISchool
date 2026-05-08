import { Module } from "@nestjs/common";
import { PrismaModule } from "@school-erp/database";
import { PlagiarismController } from "./plagiarism.controller";
import { PlagiarismService } from "./plagiarism.service";

@Module({
  imports: [PrismaModule],
  controllers: [PlagiarismController],
  providers: [PlagiarismService],
  exports: [PlagiarismService],
})
export class PlagiarismModule {}
