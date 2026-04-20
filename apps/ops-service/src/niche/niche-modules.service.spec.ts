import { Test, TestingModule } from "@nestjs/testing";
import { NicheModulesService } from "./niche-modules.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("NicheModulesService", () => {
  let service: NicheModulesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NicheModulesService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<NicheModulesService>(NicheModulesService);
  });

  describe("checkFacilityConflict", () => {
    it("should return true when conflict exists", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: "slot-1" }]);
      const result = await service.checkFacilityConflict("sch-1", "lab-1", "shift-A", "09:00", 1);
      expect(result).toBe(true);
    });

    it("should return false when no conflict", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const result = await service.checkFacilityConflict("sch-1", "lab-1", "shift-A", "09:00", 1);
      expect(result).toBe(false);
    });
  });

  describe("recordMdmCount", () => {
    it("should insert one record per class", async () => {
      await service.recordMdmCount("sch-1", new Date(), [
        { classId: "class-1", count: 35 },
        { classId: "class-2", count: 28 },
      ]);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("getShifts", () => {
    it("should return shifts for school", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { id: "sh-1", name: "Morning", start_time: "07:30", classes_count: 12 },
      ]);
      const result = await service.getShifts("sch-1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Morning");
    });
  });
});
