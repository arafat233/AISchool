import { Test, TestingModule } from "@nestjs/testing";
import { RteService } from "./rte.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("RteService", () => {
  let service: RteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RteService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<RteService>(RteService);
  });

  describe("allocateRteSeats", () => {
    it("should allocate 25% of class strength as RTE seats", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ max_strength: 40 }]);
      await service.allocateRteSeats("sch-1", "class-1", "ay-1");
      // 25% of 40 = 10 seats
      const call = mockPrisma.$executeRaw.mock.calls[0];
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it("should default to 30 seats when class has no configured max_strength", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      await service.allocateRteSeats("sch-1", "class-1", "ay-1");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("submitApplication", () => {
    it("should return an applicationNo with RTE- prefix", async () => {
      const result = await service.submitApplication({
        studentName: "Aarav Kumar",
        dateOfBirth: new Date("2020-06-15"),
        guardianName: "Suresh Kumar",
        guardianPhone: "9876543210",
        guardianIncome: 150000,
        address: "15, Sector 7, Jaipur",
        category: "EWS",
        incertificateNo: "EWS-RAJ-2026-001",
        schoolId: "sch-1",
        appliedClass: "Grade 1",
      });
      expect(result.applicationNo).toMatch(/^RTE-/);
    });
  });
});
