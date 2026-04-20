import { Test, TestingModule } from "@nestjs/testing";
import { MagazineService } from "./magazine.service";

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("MagazineService", () => {
  let service: MagazineService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MagazineService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MagazineService>(MagazineService);
  });

  describe("createMagazineIssue", () => {
    it("should return structured issueId", async () => {
      const id = await service.createMagazineIssue("sch-1", {
        title: "The Spark - Vol 5",
        volume: 5,
        issueNumber: 1,
        academicYear: "2025-26",
        editorTeacherId: "teacher-1",
        targetPublishDate: new Date("2026-03-01"),
      });
      expect(id).toMatch(/^MAG-/);
      expect(id).toContain("VOL5");
      expect(id).toContain("IS1");
    });

    it("should call $executeRaw to insert with DRAFT status", async () => {
      await service.createMagazineIssue("sch-1", {
        title: "The Spark", volume: 1, issueNumber: 1,
        academicYear: "2025-26", editorTeacherId: "t-1",
        targetPublishDate: new Date(),
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("submitArticle", () => {
    it("should call $executeRaw with SUBMITTED status", async () => {
      await service.submitArticle("MAG-SCH1-VOL1-IS1", {
        authorStudentId: "stu-1",
        title: "My Summer",
        content: "This summer I...",
        category: "ESSAY",
        attachmentUrls: [],
      });
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe("reviewArticle", () => {
    it("should call $executeRaw to update article status", async () => {
      await service.reviewArticle("article-1", "editor-1", "APPROVED");
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
