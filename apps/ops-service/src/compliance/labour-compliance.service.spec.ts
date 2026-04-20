import { Test, TestingModule } from "@nestjs/testing";
import { LabourComplianceService } from "./labour-compliance.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("LabourComplianceService", () => {
  let service: LabourComplianceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LabourComplianceService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<LabourComplianceService>(LabourComplianceService);
  });

  describe("getCalendar", () => {
    it("should return compliance items for the school", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: "item-1", category: "EPF", name: "EPF ECR Monthly Filing", status: "PENDING" },
        { id: "item-2", category: "ESI", name: "ESI Monthly Challan", status: "COMPLETED" },
      ]);
      const result = await service.getCalendar("sch-1", 2026);
      expect(result).toHaveLength(2);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it("should default to current year when year not provided", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      await service.getCalendar("sch-1");
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("markCompleted", () => {
    it("should call $executeRaw to mark item completed", async () => {
      await service.markCompleted("item-1", "https://docs.example.com/epf-ecr.pdf", "Filed on time");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
