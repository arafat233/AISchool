import { Module, OnModuleInit } from "@nestjs/common";
import { PrismaModule } from "@school-erp/database";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";
import { startRagIngestWorker } from "./rag.processor";

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule implements OnModuleInit {
  onModuleInit() {
    startRagIngestWorker();
  }
}
