import { Test, TestingModule } from "@nestjs/testing";
import { CommunityService } from "./community.service";
import { PrismaService } from "@school-erp/database";

const mockPrisma = {
  ptaCommitteeMember: { create: jest.fn(), findMany: jest.fn() },
  ptaMeeting: { create: jest.fn(), update: jest.fn() },
  ptaVote: { create: jest.fn(), update: jest.fn() },
  parentComplaint: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  outreachProgram: { create: jest.fn(), findMany: jest.fn() },
  outreachEnrollment: { create: jest.fn() },
  communityRoom: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  communityRoomBooking: { create: jest.fn(), update: jest.fn() },
};

describe("CommunityService", () => {
  let service: CommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunityService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(CommunityService);
    jest.clearAllMocks();
  });

  // ─── addPtaMember ────────────────────────────────────────────────────────────

  describe("addPtaMember", () => {
    it("creates a PTA member record", async () => {
      const member = { id: "m1" };
      mockPrisma.ptaCommitteeMember.create.mockResolvedValue(member);

      const result = await service.addPtaMember("s1", {
        memberId: "u1", memberType: "PARENT", role: "PRESIDENT", electedAt: new Date(),
      });

      expect(mockPrisma.ptaCommitteeMember.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ schoolId: "s1", role: "PRESIDENT" }) }),
      );
      expect(result).toBe(member);
    });
  });

  // ─── getPtaCommittee ─────────────────────────────────────────────────────────

  describe("getPtaCommittee", () => {
    it("returns only active members", async () => {
      mockPrisma.ptaCommitteeMember.findMany.mockResolvedValue([]);
      await service.getPtaCommittee("s1");
      expect(mockPrisma.ptaCommitteeMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      );
    });
  });

  // ─── castPtaVote ─────────────────────────────────────────────────────────────

  describe("castPtaVote", () => {
    it("increments yesCount for YES vote", async () => {
      mockPrisma.ptaVote.update.mockResolvedValue({ id: "v1", yesCount: 1 });
      await service.castPtaVote("v1", "YES");
      expect(mockPrisma.ptaVote.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { yesCount: { increment: 1 } } }),
      );
    });

    it("increments noCount for NO vote", async () => {
      mockPrisma.ptaVote.update.mockResolvedValue({ id: "v1", noCount: 1 });
      await service.castPtaVote("v1", "NO");
      expect(mockPrisma.ptaVote.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { noCount: { increment: 1 } } }),
      );
    });

    it("increments abstainCount for ABSTAIN vote", async () => {
      mockPrisma.ptaVote.update.mockResolvedValue({ id: "v1", abstainCount: 1 });
      await service.castPtaVote("v1", "ABSTAIN");
      expect(mockPrisma.ptaVote.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { abstainCount: { increment: 1 } } }),
      );
    });
  });

  // ─── closePtaVote ────────────────────────────────────────────────────────────

  describe("closePtaVote", () => {
    it("sets closedAt timestamp", async () => {
      mockPrisma.ptaVote.update.mockResolvedValue({});
      await service.closePtaVote("v1");
      expect(mockPrisma.ptaVote.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ closedAt: expect.any(Date) }) }),
      );
    });
  });
});
