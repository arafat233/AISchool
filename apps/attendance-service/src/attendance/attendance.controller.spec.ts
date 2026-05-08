import { Test, TestingModule } from "@nestjs/testing";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { AuthGuard } from "@nestjs/passport";

const mockUser = {
  id: "teacher-1",
  schoolId: "sch-1",
  tenantId: "tenant-1",
  role: "TEACHER",
  email: "teacher@school.com",
};

function makeReq(user = mockUser) {
  return { user } as any;
}

describe("AttendanceController", () => {
  let controller: AttendanceController;
  let service: jest.Mocked<AttendanceService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<AttendanceService> = {
      createSession: jest.fn(),
      bulkMark: jest.fn(),
      getSessionRecords: jest.fn(),
      getStudentSummary: jest.fn(),
      getClassSummary: jest.fn(),
      getBelowThreshold: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttendanceController>(AttendanceController);
    service = module.get(AttendanceService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "attendance-service" });
    });
  });

  describe("createSession", () => {
    it("calls service.createSession with schoolId and createdById from JWT", async () => {
      const dto = { sectionId: "sec-1", date: "2026-04-20" } as any;
      const result = { id: "sess-1" };
      service.createSession.mockResolvedValueOnce(result as any);

      const res = await controller.createSession(makeReq(), dto);
      expect(service.createSession).toHaveBeenCalledWith(
        "sch-1",
        expect.objectContaining({ sectionId: "sec-1", createdById: "teacher-1" }),
      );
      expect(res).toBe(result);
    });
  });

  describe("bulkMark", () => {
    it("calls service.bulkMark with sessionId, dto, and userId from JWT", async () => {
      const dto = { records: [{ studentId: "stu-1", status: "PRESENT" }] } as any;
      const result = { total: 1, present: 1, absent: 0 };
      service.bulkMark.mockResolvedValueOnce(result as any);

      const res = await controller.bulkMark("sess-1", makeReq(), dto);
      expect(service.bulkMark).toHaveBeenCalledWith("sess-1", dto, "teacher-1");
      expect(res).toBe(result);
    });
  });

  describe("getRecords", () => {
    it("delegates to service.getSessionRecords", async () => {
      service.getSessionRecords.mockResolvedValueOnce([] as any);
      await controller.getRecords("sess-1");
      expect(service.getSessionRecords).toHaveBeenCalledWith("sess-1");
    });
  });

  describe("studentSummary", () => {
    it("calls service.getStudentSummary with id and date range", async () => {
      service.getStudentSummary.mockResolvedValueOnce({ total: 10, present: 8, absent: 2, percentage: 80 } as any);
      const res = await controller.studentSummary("stu-1", "2026-04-01", "2026-04-30");
      expect(service.getStudentSummary).toHaveBeenCalledWith("stu-1", "2026-04-01", "2026-04-30");
      expect(res).toBeDefined();
    });
  });

  describe("classSummary", () => {
    it("calls service.getClassSummary with sectionId and date", async () => {
      service.getClassSummary.mockResolvedValueOnce({} as any);
      await controller.classSummary("sec-1", "2026-04-20");
      expect(service.getClassSummary).toHaveBeenCalledWith("sec-1", "2026-04-20");
    });
  });

  describe("belowThreshold", () => {
    it("uses default threshold of 75 when not provided", async () => {
      service.getBelowThreshold.mockResolvedValueOnce([] as any);
      await controller.belowThreshold(makeReq(), "sec-1", "ay-1");
      expect(service.getBelowThreshold).toHaveBeenCalledWith("sch-1", "sec-1", "ay-1", 75);
    });

    it("parses threshold string to number", async () => {
      service.getBelowThreshold.mockResolvedValueOnce([] as any);
      await controller.belowThreshold(makeReq(), "sec-1", "ay-1", "80");
      expect(service.getBelowThreshold).toHaveBeenCalledWith("sch-1", "sec-1", "ay-1", 80);
    });
  });
});
