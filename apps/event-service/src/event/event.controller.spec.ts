import { Test, TestingModule } from "@nestjs/testing";
import { EventController } from "./event.controller";
import { EventService } from "./event.service";

const mockEventService = {
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  getEvents: jest.fn(),
  getEventById: jest.fn(),
  deleteEvent: jest.fn(),
  registerParticipant: jest.fn(),
  checkInParticipant: jest.fn(),
  getParticipants: jest.fn(),
  initSportsDay: jest.fn(),
  addSportsDayTrack: jest.fn(),
  createHeat: jest.fn(),
  addSportsEntry: jest.fn(),
  recordSportsResult: jest.fn(),
  awardHousePoints: jest.fn(),
  getHouseLeaderboard: jest.fn(),
  declareChampionHouse: jest.fn(),
  getMedalTally: jest.fn(),
  initDramaProduction: jest.fn(),
  scheduleAudition: jest.fn(),
  recordAuditionResult: jest.fn(),
  scheduleRehearsal: jest.fn(),
  manageDramaProp: jest.fn(),
  updateDramaProp: jest.fn(),
  bookDramaTicket: jest.fn(),
  checkInDramaTicket: jest.fn(),
  getDramaConfig: jest.fn(),
  initCompetition: jest.fn(),
  registerCompetitionParticipant: jest.fn(),
  addJudge: jest.fn(),
  createCompRound: jest.fn(),
  submitScore: jest.fn(),
  eliminateParticipant: jest.fn(),
  declareCompetitionResult: jest.fn(),
  createClub: jest.fn(),
  updateClub: jest.fn(),
  getClubs: jest.fn(),
  applyForClub: jest.fn(),
  reviewClubApplication: jest.fn(),
  recordClubSession: jest.fn(),
  addClubAchievement: jest.fn(),
  getClubMembers: jest.fn(),
  createYouthUnit: jest.fn(),
  enrollYouthMember: jest.fn(),
  updateYouthMemberProgress: jest.fn(),
  createYouthCamp: jest.fn(),
  getYouthUnit: jest.fn(),
  startElection: jest.fn(),
  nominate: jest.fn(),
  openVoting: jest.fn(),
  castVote: jest.fn(),
  declareElectionResults: jest.fn(),
  recordCouncilMeeting: jest.fn(),
  getElection: jest.fn(),
  createHouse: jest.fn(),
  updateHouse: jest.fn(),
  assignStudentToHouse: jest.fn(),
  getHouseDetails: jest.fn(),
  getHouses: jest.fn(),
  publishEventPhotos: jest.fn(),
  getEventPhotos: jest.fn(),
  linkAchievementToPortfolio: jest.fn(),
  getStudentEventAchievements: jest.fn(),
};

describe("EventController", () => {
  let controller: EventController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [{ provide: EventService, useValue: mockEventService }],
    })
      .overrideGuard(require("@nestjs/passport").AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EventController>(EventController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ─── Event CRUD ────────────────────────────────────────────────────────────

  describe("createEvent", () => {
    it("returns created event from service", async () => {
      const result = { id: "ev1", title: "Sports Day" };
      mockEventService.createEvent.mockResolvedValue(result);
      const body = {
        createdBy: "user1",
        title: "Sports Day",
        type: "SPORTS",
        startDate: "2025-01-01",
        endDate: "2025-01-01",
      };
      expect(await controller.createEvent("school1", body)).toEqual(result);
      expect(mockEventService.createEvent).toHaveBeenCalledWith(
        "school1",
        "user1",
        expect.objectContaining({ title: "Sports Day" }),
      );
    });

    it("propagates service errors", async () => {
      mockEventService.createEvent.mockRejectedValue(new Error("DB error"));
      const body = { createdBy: "u", title: "T", type: "SPORTS", startDate: "2025-01-01", endDate: "2025-01-01" };
      await expect(controller.createEvent("school1", body)).rejects.toThrow("DB error");
    });
  });

  describe("getEvents", () => {
    it("returns events list from service", async () => {
      const events = [{ id: "ev1" }, { id: "ev2" }];
      mockEventService.getEvents.mockResolvedValue(events);
      const result = await controller.getEvents("school1", "SPORTS", "UPCOMING");
      expect(result).toEqual(events);
      expect(mockEventService.getEvents).toHaveBeenCalledWith(
        "school1",
        "SPORTS",
        "UPCOMING",
        undefined,
        undefined,
      );
    });
  });

  describe("getEventById", () => {
    it("returns a single event from service", async () => {
      const event = { id: "ev1", title: "Sports Day" };
      mockEventService.getEventById.mockResolvedValue(event);
      expect(await controller.getEventById("ev1")).toEqual(event);
    });
  });

  describe("updateEvent", () => {
    it("passes update dto to service", async () => {
      const updated = { id: "ev1", title: "Updated" };
      mockEventService.updateEvent.mockResolvedValue(updated);
      const dto = { title: "Updated" } as any;
      expect(await controller.updateEvent("ev1", dto)).toEqual(updated);
      expect(mockEventService.updateEvent).toHaveBeenCalledWith("ev1", dto);
    });
  });

  describe("deleteEvent", () => {
    it("calls service and returns result", async () => {
      mockEventService.deleteEvent.mockResolvedValue({ id: "ev1", status: "CANCELLED" });
      const result = await controller.deleteEvent("ev1");
      expect(mockEventService.deleteEvent).toHaveBeenCalledWith("ev1");
      expect(result).toEqual({ id: "ev1", status: "CANCELLED" });
    });
  });

  // ─── Participants ──────────────────────────────────────────────────────────

  describe("registerParticipant", () => {
    it("passes eventId and body to service", async () => {
      const registration = { id: "p1" };
      mockEventService.registerParticipant.mockResolvedValue(registration);
      const body = { memberId: "m1", memberRole: "STUDENT" };
      expect(await controller.registerParticipant("ev1", body)).toEqual(registration);
      expect(mockEventService.registerParticipant).toHaveBeenCalledWith("ev1", body);
    });
  });

  describe("checkInParticipant", () => {
    it("calls service with eventId and memberId", async () => {
      mockEventService.checkInParticipant.mockResolvedValue({ checkedIn: true });
      await controller.checkInParticipant("ev1", "m1");
      expect(mockEventService.checkInParticipant).toHaveBeenCalledWith("ev1", "m1");
    });
  });

  // ─── Sports Day ────────────────────────────────────────────────────────────

  describe("initSportsDay", () => {
    it("delegates to service", async () => {
      mockEventService.initSportsDay.mockResolvedValue({ id: "sd1" });
      await controller.initSportsDay("ev1");
      expect(mockEventService.initSportsDay).toHaveBeenCalledWith("ev1");
    });
  });

  describe("getHouseLeaderboard", () => {
    it("returns leaderboard for schoolId", async () => {
      const lb = [{ houseId: "h1", points: 100 }];
      mockEventService.getHouseLeaderboard.mockResolvedValue(lb);
      expect(await controller.getHouseLeaderboard("school1")).toEqual(lb);
      expect(mockEventService.getHouseLeaderboard).toHaveBeenCalledWith("school1");
    });
  });

  // ─── Clubs ─────────────────────────────────────────────────────────────────

  describe("createClub", () => {
    it("creates club with schoolId from param", async () => {
      const club = { id: "c1", name: "Robotics" };
      mockEventService.createClub.mockResolvedValue(club);
      const body = { name: "Robotics", advisorId: "adv1" };
      expect(await controller.createClub("school1", body)).toEqual(club);
      expect(mockEventService.createClub).toHaveBeenCalledWith("school1", body);
    });
  });

  describe("getClubs", () => {
    it("returns clubs for schoolId", async () => {
      const clubs = [{ id: "c1" }, { id: "c2" }];
      mockEventService.getClubs.mockResolvedValue(clubs);
      expect(await controller.getClubs("school1")).toEqual(clubs);
    });
  });

  // ─── Houses ────────────────────────────────────────────────────────────────

  describe("createHouse", () => {
    it("creates house with schoolId from param", async () => {
      const house = { id: "h1", name: "Red" };
      mockEventService.createHouse.mockResolvedValue(house);
      const body = { name: "Red", colour: "red", houseMasterId: "hm1" };
      expect(await controller.createHouse("school1", body)).toEqual(house);
      expect(mockEventService.createHouse).toHaveBeenCalledWith("school1", body);
    });
  });

  // ─── Health ────────────────────────────────────────────────────────────────

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "event-service" });
    });
  });
});
