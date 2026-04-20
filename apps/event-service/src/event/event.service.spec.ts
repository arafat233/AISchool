import { Test, TestingModule } from "@nestjs/testing";
import { EventService } from "./event.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

const mockPrisma = {
  schoolEvent: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  eventParticipant: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  sportsDayConfig: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  sportsDayTrack: { create: jest.fn() },
  sportsHeat: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  sportsEntry: { create: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  sportsMedal: { create: jest.fn() },
  housePoints: { create: jest.fn() },
  house: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  houseMembership: { upsert: jest.fn() },
  dramaProductionConfig: { upsert: jest.fn(), findUnique: jest.fn() },
  dramaAudition: { create: jest.fn(), update: jest.fn() },
  dramaCasting: { upsert: jest.fn() },
  dramaRehearsal: { create: jest.fn() },
  dramaProp: { create: jest.fn(), update: jest.fn() },
  dramaTicket: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  competitionConfig: { upsert: jest.fn(), update: jest.fn() },
  compParticipant: { create: jest.fn(), update: jest.fn() },
  compJudge: { create: jest.fn() },
  compRound: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  compScore: { create: jest.fn() },
  club: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  clubMembership: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  clubSession: { create: jest.fn() },
  youthOrganizationUnit: { upsert: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  youthOrgMember: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  youthCamp: { create: jest.fn() },
  studentCouncilElection: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  councilNomination: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  councilVote: { create: jest.fn() },
  councilRole: { upsert: jest.fn() },
  councilMeeting: { create: jest.fn() },
  eventPhoto: { create: jest.fn(), findMany: jest.fn() },
  portfolioItem: { create: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};

describe("EventService", () => {
  let service: EventService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventService, { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<EventService>(EventService);
  });

  describe("createEvent", () => {
    it("should create a school event", async () => {
      mockPrisma.schoolEvent.create.mockResolvedValueOnce({ id: "ev-1", title: "Sports Day" });
      const result = await service.createEvent("sch-1", "admin-1", {
        title: "Sports Day", type: "SPORTS_DAY",
        startDate: new Date("2026-11-01"), endDate: new Date("2026-11-01"),
      });
      expect(result.id).toBe("ev-1");
    });
  });

  describe("registerParticipant", () => {
    it("should throw ConflictError when field trip has no consent doc", async () => {
      mockPrisma.schoolEvent.findUnique.mockResolvedValueOnce({ id: "ev-1", type: "FIELD_TRIP" });
      await expect(service.registerParticipant("ev-1", { memberId: "stu-1", memberRole: "STUDENT" }))
        .rejects.toBeInstanceOf(ConflictError);
    });

    it("should throw NotFoundError when event not found", async () => {
      mockPrisma.schoolEvent.findUnique.mockResolvedValueOnce(null);
      await expect(service.registerParticipant("unknown", { memberId: "stu-1", memberRole: "STUDENT" }))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it("should register participant with QR code", async () => {
      mockPrisma.schoolEvent.findUnique.mockResolvedValueOnce({ id: "ev-1", type: "SPORTS_DAY" });
      mockPrisma.eventParticipant.upsert.mockResolvedValueOnce({ id: "p-1", qrCode: "EVENT-ev-1-stu-1-XXXX" });
      const result = await service.registerParticipant("ev-1", { memberId: "stu-1", memberRole: "STUDENT" });
      expect(result.id).toBe("p-1");
    });
  });

  describe("applyForClub", () => {
    it("should create club membership", async () => {
      mockPrisma.club.findUnique.mockResolvedValueOnce({ id: "club-1", name: "Science Club" });
      mockPrisma.clubMembership.upsert.mockResolvedValueOnce({ id: "mem-1", clubId: "club-1" });
      const result = await service.applyForClub("club-1", "stu-1");
      expect(result.id).toBe("mem-1");
    });

    it("should throw NotFoundError when club not found", async () => {
      mockPrisma.club.findUnique.mockResolvedValueOnce(null);
      await expect(service.applyForClub("unknown", "stu-1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("nominate", () => {
    it("should create nomination when election is in NOMINATION status", async () => {
      mockPrisma.studentCouncilElection.findUnique.mockResolvedValueOnce({ id: "el-1", status: "NOMINATION" });
      mockPrisma.councilNomination.create.mockResolvedValueOnce({ id: "nom-1", role: "Head Boy" });
      const result = await service.nominate("el-1", "stu-1", "Head Boy");
      expect(result.id).toBe("nom-1");
    });

    it("should throw ConflictError when election is not in NOMINATION status", async () => {
      mockPrisma.studentCouncilElection.findUnique.mockResolvedValueOnce({ id: "el-1", status: "VOTING" });
      await expect(service.nominate("el-1", "stu-1", "Head Boy")).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("getHouseLeaderboard", () => {
    it("should sort houses by total points descending", async () => {
      mockPrisma.house.findMany.mockResolvedValueOnce([
        { id: "h-1", name: "Red", colour: "red", housePoints: [{ category: "SPORTS", points: 30 }, { category: "ACADEMIC", points: 20 }] },
        { id: "h-2", name: "Blue", colour: "blue", housePoints: [{ category: "SPORTS", points: 60 }] },
      ]);
      const result = await service.getHouseLeaderboard("sch-1");
      expect(result[0].name).toBe("Blue");
      expect(result[0].totalPoints).toBe(60);
      expect(result[1].totalPoints).toBe(50);
    });
  });

  describe("assignStudentToHouse", () => {
    it("should upsert house membership for student", async () => {
      mockPrisma.houseMembership.upsert.mockResolvedValueOnce({ id: "hm-1", houseId: "h-1" });
      const result = await service.assignStudentToHouse("h-1", "stu-1", "2026-27");
      expect(result.houseId).toBe("h-1");
    });
  });

  describe("checkInParticipant", () => {
    it("should throw NotFoundError when participant not registered", async () => {
      mockPrisma.eventParticipant.findUnique.mockResolvedValueOnce(null);
      await expect(service.checkInParticipant("ev-1", "stu-1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should set checkedIn=true", async () => {
      mockPrisma.eventParticipant.findUnique.mockResolvedValueOnce({ id: "p-1", checkedIn: false });
      mockPrisma.eventParticipant.update.mockResolvedValueOnce({ id: "p-1", checkedIn: true });
      const result = await service.checkInParticipant("ev-1", "stu-1");
      expect(result.checkedIn).toBe(true);
    });
  });
});
