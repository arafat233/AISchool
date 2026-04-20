import { Test, TestingModule } from "@nestjs/testing";
import { TransportService } from "./transport.service";
import { NotFoundError } from "@school-erp/errors";

jest.mock("mqtt", () => ({ connect: jest.fn(() => ({ on: jest.fn(), subscribe: jest.fn() })) }));

const mockPrisma = {
  transportRoute: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  routeStop: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  studentTransport: { create: jest.fn(), findMany: jest.fn() },
  busGpsLog: { create: jest.fn() },
  vehicle: { findFirst: jest.fn(), update: jest.fn() },
  tripLog: { create: jest.fn(), update: jest.fn() },
};

const mockGateway = { broadcastLocation: jest.fn() };

describe("TransportService", () => {
  let service: TransportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportService,
        { provide: require("@school-erp/database").PrismaService, useValue: mockPrisma },
        { provide: require("./location.gateway").LocationGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<TransportService>(TransportService);
  });

  describe("createRoute", () => {
    it("should create a transport route", async () => {
      mockPrisma.transportRoute.create.mockResolvedValueOnce({ id: "route-1", name: "Route A" });
      const result = await service.createRoute("sch-1", { name: "Route A" });
      expect(result.id).toBe("route-1");
    });
  });

  describe("addStop", () => {
    it("should add a stop to existing route", async () => {
      mockPrisma.routeStop.create.mockResolvedValueOnce({ id: "stop-1", name: "Sector 5", orderIndex: 1 });
      const result = await service.addStop("route-1", {
        name: "Sector 5", latitude: 12.9716, longitude: 77.5946, orderIndex: 1,
      });
      expect(result.id).toBe("stop-1");
    });
  });

  describe("assignStudentToRoute", () => {
    it("should create student transport assignment", async () => {
      mockPrisma.studentTransport.create.mockResolvedValueOnce({ id: "st-1", studentId: "stu-1" });
      const result = await service.assignStudentToRoute("stu-1", "route-1", { stopName: "Sector 5" });
      expect(result.studentId).toBe("stu-1");
    });
  });

  describe("ingestGpsLocation", () => {
    it("should log GPS location and broadcast", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValueOnce({ id: "veh-1", routeId: "route-1" });
      mockPrisma.busGpsLog.create.mockResolvedValueOnce({ id: "gps-1" });
      mockPrisma.vehicle.update.mockResolvedValueOnce({});

      await service.ingestGpsLocation("GPS001", { lat: 12.9716, lng: 77.5946 });
      expect(mockPrisma.busGpsLog.create).toHaveBeenCalled();
    });
  });
});
