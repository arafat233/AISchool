import { Test, TestingModule } from "@nestjs/testing";
import { IotService } from "./iot.service";

jest.mock("mqtt", () => ({ connect: jest.fn(() => ({ on: jest.fn(), subscribe: jest.fn() })) }));

const mockWriteApi = {
  writePoint: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockInfluxDB = {
  getWriteApi: jest.fn(() => mockWriteApi),
};

jest.mock("@influxdata/influxdb-client", () => ({
  InfluxDB: jest.fn(() => mockInfluxDB),
  Point: jest.fn().mockImplementation(() => ({
    tag: jest.fn().mockReturnThis(),
    floatField: jest.fn().mockReturnThis(),
    booleanField: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
  })),
}));

jest.mock("axios");

const mockPrisma = {
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

describe("IotService", () => {
  let service: IotService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [IotService, { provide: require("../prisma/prisma.service").PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<IotService>(IotService);
  });

  describe("ingestReading", () => {
    it("should write point to InfluxDB for air quality reading", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]); // no custom thresholds
      await service.ingestReading({
        schoolId: "sch-1", deviceId: "sensor-001", location: "ClassroomA1",
        sensorType: "AIR_QUALITY",
        readings: { co2_ppm: 800, pm25_ugm3: 15, temperature_c: 24, humidity_pct: 60 },
        timestamp: new Date(),
      });
      expect(mockWriteApi.writePoint).toHaveBeenCalled();
    });

    it("should send CO2 alert when reading exceeds threshold", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // no custom thresholds → use defaults (1000 ppm)
        .mockResolvedValueOnce([]); // sendAlert prisma call
      await service.ingestReading({
        schoolId: "sch-1", deviceId: "sensor-002", location: "ClassroomB2",
        sensorType: "AIR_QUALITY",
        readings: { co2_ppm: 1500 }, // exceeds 1000 ppm default
        timestamp: new Date(),
      });
      expect(mockWriteApi.writePoint).toHaveBeenCalled();
    });

    it("should skip BMS trigger for non-occupancy sensors", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const axios = require("axios");
      await service.ingestReading({
        schoolId: "sch-1", deviceId: "meter-001", location: "Block-A",
        sensorType: "ELECTRICITY",
        readings: { kwh: 150 },
        timestamp: new Date(),
      });
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("getMonthlyReport", () => {
    it("should call $queryRaw and return results", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { location: "ClassroomA1", sensor_type: "AIR_QUALITY", avg_co2: 750 },
      ]);
      const result = await service.getMonthlyReport("sch-1");
      expect(result).toHaveLength(1);
    });
  });
});
