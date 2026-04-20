import { Test, TestingModule } from "@nestjs/testing";
import { EmailProvisionService } from "./email-provision.service";

jest.mock("googleapis", () => ({
  google: { auth: { JWT: jest.fn() }, admin: jest.fn(() => ({ users: { insert: jest.fn(), delete: jest.fn() } })) },
}));
jest.mock("axios");

const mockPrisma = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

describe("EmailProvisionService", () => {
  let service: EmailProvisionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProvisionService, { provide: "PrismaService", useValue: mockPrisma }],
    })
      .overrideProvider(EmailProvisionService)
      .useValue(new (require("./email-provision.service").EmailProvisionService)(mockPrisma))
      .compile();
    service = module.get<EmailProvisionService>(EmailProvisionService);
  });

  describe("provisionEmail", () => {
    it("should return null when provider is NONE", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ provider: "NONE", domain: "" }]);
      const result = await service.provisionEmail("student-1", "school-1");
      expect(result).toBeNull();
    });

    it("should return null when student not found", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ provider: "GOOGLE_WORKSPACE", domain: "school.edu" }])
        .mockResolvedValueOnce([]); // no student
      const result = await service.provisionEmail("student-x", "school-1");
      expect(result).toBeNull();
    });
  });

  describe("deprovisionEmail", () => {
    it("should skip if provider is NONE", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ provider: "NONE" }]);
      await service.deprovisionEmail("student-1", "school-1");
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it("should skip if student has no school_email", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ provider: "GOOGLE_WORKSPACE", domain: "school.edu" }])
        .mockResolvedValueOnce([{ school_email: null }]);
      await service.deprovisionEmail("student-1", "school-1");
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });
  });
});
