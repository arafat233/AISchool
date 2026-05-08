import { Test, TestingModule } from "@nestjs/testing";
import { TransportController } from "./transport.controller";
import { TransportService } from "./transport.service";
import { AuthGuard } from "@nestjs/passport";

const mockUser = {
  id: "user-1",
  schoolId: "sch-1",
  tenantId: "tenant-1",
  role: "ADMIN",
  email: "admin@school.com",
};

function makeReq(user = mockUser) {
  return { user } as any;
}

describe("TransportController", () => {
  let controller: TransportController;
  let service: jest.Mocked<TransportService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<TransportService> = {
      createRoute: jest.fn(),
      getRoutes: jest.fn(),
      addStop: jest.fn(),
      updateStop: jest.fn(),
      deleteStop: jest.fn(),
      createVehicle: jest.fn(),
      getVehicles: jest.fn(),
      updateVehicle: jest.fn(),
      addMaintenanceLog: jest.fn(),
      getMaintenanceLogs: jest.fn(),
      createDriver: jest.fn(),
      getDrivers: jest.fn(),
      assignStudent: jest.fn(),
      getStudentAssignment: jest.fn(),
      startTrip: jest.fn(),
      endTrip: jest.fn(),
      getTrips: jest.fn(),
      getTripHistory: jest.fn(),
      getActiveTripLocation: jest.fn(),
      // assignStudentToRoute is only in the spec, not the controller
      ingestGpsLocation: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransportController],
      providers: [{ provide: TransportService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard("jwt"))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransportController>(TransportController);
    service = module.get(TransportService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("health", () => {
    it("returns ok status", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "transport-service" });
    });
  });

  describe("createRoute", () => {
    it("calls service.createRoute with schoolId from JWT and dto", async () => {
      const dto = { name: "Route A" } as any;
      const result = { id: "route-1", name: "Route A" };
      service.createRoute.mockResolvedValueOnce(result as any);

      const res = await controller.createRoute(makeReq(), dto);
      expect(service.createRoute).toHaveBeenCalledWith("sch-1", dto);
      expect(res).toBe(result);
    });
  });

  describe("getRoutes", () => {
    it("calls service.getRoutes with schoolId from JWT", async () => {
      service.getRoutes.mockResolvedValueOnce([] as any);
      await controller.getRoutes(makeReq());
      expect(service.getRoutes).toHaveBeenCalledWith("sch-1");
    });
  });

  describe("addStop", () => {
    it("delegates to service.addStop with routeId and dto", async () => {
      const dto = { name: "Sector 5", latitude: 12.97, longitude: 77.59, orderIndex: 1 } as any;
      service.addStop.mockResolvedValueOnce({ id: "stop-1" } as any);
      await controller.addStop("route-1", dto);
      expect(service.addStop).toHaveBeenCalledWith("route-1", dto);
    });
  });

  describe("updateStop", () => {
    it("delegates to service.updateStop", async () => {
      service.updateStop.mockResolvedValueOnce({ id: "stop-1" } as any);
      await controller.updateStop("stop-1", { name: "Sector 6" } as any);
      expect(service.updateStop).toHaveBeenCalledWith("stop-1", { name: "Sector 6" });
    });
  });

  describe("deleteStop", () => {
    it("delegates to service.deleteStop", async () => {
      service.deleteStop.mockResolvedValueOnce({} as any);
      await controller.deleteStop("stop-1");
      expect(service.deleteStop).toHaveBeenCalledWith("stop-1");
    });
  });

  describe("createVehicle", () => {
    it("calls service.createVehicle with schoolId from JWT and date-converted dto", async () => {
      const dto = { registrationNo: "KA01AB1234", make: "Tata", model: "Starbus", capacity: 40 } as any;
      service.createVehicle.mockResolvedValueOnce({ id: "veh-1" } as any);
      await controller.createVehicle(makeReq(), dto);
      expect(service.createVehicle).toHaveBeenCalledWith("sch-1", expect.objectContaining({ registrationNo: "KA01AB1234" }));
    });
  });

  describe("getVehicles", () => {
    it("calls service.getVehicles with schoolId from JWT", async () => {
      service.getVehicles.mockResolvedValueOnce([] as any);
      await controller.getVehicles(makeReq());
      expect(service.getVehicles).toHaveBeenCalledWith("sch-1");
    });
  });

  describe("createDriver", () => {
    it("calls service.createDriver with schoolId from JWT", async () => {
      const dto = { name: "Ramu", phone: "9876543210" } as any;
      service.createDriver.mockResolvedValueOnce({ id: "drv-1" } as any);
      await controller.createDriver(makeReq(), dto);
      expect(service.createDriver).toHaveBeenCalledWith("sch-1", expect.any(Object));
    });
  });

  describe("getDrivers", () => {
    it("calls service.getDrivers with schoolId from JWT", async () => {
      service.getDrivers.mockResolvedValueOnce([] as any);
      await controller.getDrivers(makeReq());
      expect(service.getDrivers).toHaveBeenCalledWith("sch-1");
    });
  });

  describe("assignStudent", () => {
    it("delegates to service.assignStudent with dto", async () => {
      const dto = { studentId: "stu-1", routeId: "route-1", stopId: "stop-1" } as any;
      service.assignStudent.mockResolvedValueOnce({ id: "sa-1" } as any);
      await controller.assignStudent(dto);
      expect(service.assignStudent).toHaveBeenCalledWith(dto);
    });
  });

  describe("getStudentAssignment", () => {
    it("delegates to service.getStudentAssignment", async () => {
      service.getStudentAssignment.mockResolvedValueOnce({} as any);
      await controller.getStudentAssignment("stu-1");
      expect(service.getStudentAssignment).toHaveBeenCalledWith("stu-1");
    });
  });

  describe("startTrip", () => {
    it("calls service.startTrip with schoolId from JWT and dto fields", async () => {
      const dto = { routeId: "route-1", vehicleId: "veh-1", driverId: "drv-1", direction: "MORNING" } as any;
      service.startTrip.mockResolvedValueOnce({ id: "trip-1" } as any);
      await controller.startTrip(makeReq(), dto);
      expect(service.startTrip).toHaveBeenCalledWith(expect.objectContaining({ schoolId: "sch-1" }));
    });
  });

  describe("endTrip", () => {
    it("calls service.endTrip with trip id and optional notes", async () => {
      service.endTrip.mockResolvedValueOnce({ id: "trip-1" } as any);
      await controller.endTrip("trip-1", "All good");
      expect(service.endTrip).toHaveBeenCalledWith("trip-1", "All good");
    });
  });

  describe("getTrips", () => {
    it("calls service.getTrips with schoolId and parses date string", async () => {
      service.getTrips.mockResolvedValueOnce([] as any);
      await controller.getTrips(makeReq(), "2026-05-07");
      expect(service.getTrips).toHaveBeenCalledWith("sch-1", expect.any(Date));
    });
  });

  describe("getLiveLocation", () => {
    it("delegates to service.getActiveTripLocation", async () => {
      service.getActiveTripLocation.mockResolvedValueOnce({} as any);
      await controller.getLiveLocation("route-1");
      expect(service.getActiveTripLocation).toHaveBeenCalledWith("route-1");
    });
  });

  describe("getStudentTransport", () => {
    it("delegates to service.getStudentAssignment", async () => {
      service.getStudentAssignment.mockResolvedValueOnce({} as any);
      await controller.getStudentTransport("stu-1");
      expect(service.getStudentAssignment).toHaveBeenCalledWith("stu-1");
    });
  });
});
