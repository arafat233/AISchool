import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError } from "@school-erp/errors";
import * as mqtt from "mqtt";
import { LocationGateway } from "./location.gateway";

const GEOFENCE_STOP_METERS = 500;
const SPEED_LIMIT_KMH = 60;
const ROUTE_DEVIATION_METERS = 200;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class TransportService implements OnModuleInit {
  private mqttClient?: mqtt.MqttClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationGateway: LocationGateway,
  ) {}

  onModuleInit() {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl) return;

    this.mqttClient = mqtt.connect(brokerUrl, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    });

    this.mqttClient.on("connect", () => {
      this.mqttClient!.subscribe("school/bus/+/location");
    });

    this.mqttClient.on("message", async (topic, payload) => {
      // Topic: school/bus/{gpsDeviceId}/location
      const parts = topic.split("/");
      const gpsDeviceId = parts[2];
      try {
        const data = JSON.parse(payload.toString()) as {
          lat: number; lng: number; speedKmh?: number; heading?: number;
        };
        await this.ingestGpsLocation(gpsDeviceId, data);
      } catch {}
    });
  }

  // ─── Routes ───────────────────────────────────────────────────────────────────

  async createRoute(schoolId: string, data: { name: string; description?: string }) {
    return this.prisma.transportRoute.create({ data: { schoolId, ...data } });
  }

  async getRoutes(schoolId: string) {
    return this.prisma.transportRoute.findMany({
      where: { schoolId, isActive: true },
      include: { stops: { orderBy: { sequence: "asc" } }, _count: { select: { assignments: true } } },
    });
  }

  async addStop(routeId: string, data: {
    name: string; lat: number; lng: number; sequence: number; expectedArrivalTime?: string;
  }) {
    return this.prisma.routeStop.create({ data: { routeId, ...data } });
  }

  async updateStop(stopId: string, data: any) {
    return this.prisma.routeStop.update({ where: { id: stopId }, data });
  }

  async deleteStop(stopId: string) {
    return this.prisma.routeStop.delete({ where: { id: stopId } });
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────────

  async createVehicle(schoolId: string, data: {
    regNo: string; make?: string; model?: string; capacity: number; gpsDeviceId?: string;
    insuranceExpiry?: Date; fitnessExpiry?: Date; pucExpiry?: Date;
  }) {
    return this.prisma.vehicle.create({ data: { schoolId, ...data } });
  }

  async getVehicles(schoolId: string) {
    return this.prisma.vehicle.findMany({
      where: { schoolId, isActive: true },
      include: { _count: { select: { trips: true } } },
    });
  }

  async updateVehicle(id: string, data: any) {
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  async addMaintenanceLog(vehicleId: string, data: {
    serviceType: string; description?: string; cost?: number;
    serviceDate: Date; nextDueDate?: Date; odometer?: number; vendorName?: string;
  }) {
    return this.prisma.vehicleMaintenanceLog.create({ data: { vehicleId, ...data } });
  }

  async getMaintenanceLogs(vehicleId: string) {
    return this.prisma.vehicleMaintenanceLog.findMany({
      where: { vehicleId },
      orderBy: { serviceDate: "desc" },
    });
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────────

  async createDriver(schoolId: string, data: {
    name: string; phone: string; licenceNo: string; licenceExpiry?: Date; staffId?: string;
  }) {
    return this.prisma.driver.create({ data: { schoolId, ...data } });
  }

  async getDrivers(schoolId: string) {
    return this.prisma.driver.findMany({ where: { schoolId, isActive: true } });
  }

  // ─── Student assignment ───────────────────────────────────────────────────────

  async assignStudent(data: {
    studentId: string; routeId: string; stopId: string;
    direction?: string; academicYear: string;
  }) {
    return this.prisma.studentRouteAssignment.upsert({
      where: { studentId_academicYear: { studentId: data.studentId, academicYear: data.academicYear } },
      create: { ...data, direction: data.direction ?? "BOTH" },
      update: { routeId: data.routeId, stopId: data.stopId, direction: data.direction ?? "BOTH" },
    });
  }

  async getStudentAssignment(studentId: string) {
    return this.prisma.studentRouteAssignment.findFirst({
      where: { studentId, isActive: true },
      include: { route: true, stop: true },
    });
  }

  // ─── Trip management ──────────────────────────────────────────────────────────

  async startTrip(data: {
    schoolId: string; routeId: string; vehicleId: string; driverId: string;
    tripType?: string; checklist?: Record<string, boolean>;
  }) {
    // Validate pre-trip checklist — block critical failures
    if (data.checklist) {
      const criticalItems = ["tyres", "brakes", "lights", "horn"];
      const failed = criticalItems.filter((item) => data.checklist![item] === false);
      if (failed.length > 0) {
        throw new Error(`Pre-trip checklist failed: ${failed.join(", ")}. Trip blocked.`);
      }
    }

    return this.prisma.trip.create({
      data: {
        schoolId: data.schoolId,
        routeId: data.routeId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        tripType: data.tripType ?? "MORNING",
        status: "IN_PROGRESS",
        startedAt: new Date(),
        checklist: data.checklist,
      },
    });
  }

  async endTrip(tripId: string, incidentNotes?: string) {
    return this.prisma.trip.update({
      where: { id: tripId },
      data: { status: "COMPLETED", completedAt: new Date(), incidentNotes },
    });
  }

  async getTrips(schoolId: string, date?: Date) {
    const start = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined;
    const end = date ? new Date(date.setHours(23, 59, 59, 999)) : undefined;
    return this.prisma.trip.findMany({
      where: {
        schoolId,
        ...(start && end ? { date: { gte: start, lte: end } } : {}),
      },
      include: { route: true, vehicle: true, driver: true },
      orderBy: { date: "desc" },
    });
  }

  async getTripHistory(tripId: string) {
    return this.prisma.tripLocationLog.findMany({
      where: { tripId },
      orderBy: { timestamp: "asc" },
    });
  }

  // ─── GPS ingestion (called by MQTT handler) ───────────────────────────────────

  async ingestGpsLocation(gpsDeviceId: string, data: {
    lat: number; lng: number; speedKmh?: number; heading?: number;
  }) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { gpsDeviceId } });
    if (!vehicle) return;

    // Find active trip for this vehicle
    const trip = await this.prisma.trip.findFirst({
      where: { vehicleId: vehicle.id, status: "IN_PROGRESS" },
      include: { route: { include: { stops: { orderBy: { sequence: "asc" } } } } },
    });
    if (!trip) return;

    // Store location log
    await this.prisma.tripLocationLog.create({
      data: { tripId: trip.id, lat: data.lat, lng: data.lng, speedKmh: data.speedKmh, heading: data.heading },
    });

    // Broadcast to WebSocket subscribers
    this.locationGateway.broadcastLocation(trip.id, {
      lat: data.lat, lng: data.lng, speedKmh: data.speedKmh, heading: data.heading,
      timestamp: new Date(),
    });

    // ── Geofencing: stop proximity ─────────────────────────────────────────────
    for (const stop of trip.route.stops) {
      const dist = haversineMeters(data.lat, data.lng, stop.lat, stop.lng);
      if (dist <= GEOFENCE_STOP_METERS) {
        // Production: push notification to parents of students assigned to this stop
        console.log(`[GEOFENCE] Bus approaching stop: ${stop.name} (${Math.round(dist)}m)`);
      }
    }

    // ── Speed alert ────────────────────────────────────────────────────────────
    if (data.speedKmh && data.speedKmh > SPEED_LIMIT_KMH) {
      console.log(`[SPEED ALERT] Vehicle ${vehicle.regNo}: ${data.speedKmh} km/h > ${SPEED_LIMIT_KMH} km/h`);
      // Production: push to Transport Manager
    }

    // ── Route deviation ────────────────────────────────────────────────────────
    const stops = trip.route.stops;
    const minDist = stops.reduce((min, stop) => {
      const d = haversineMeters(data.lat, data.lng, stop.lat, stop.lng);
      return Math.min(min, d);
    }, Infinity);

    if (minDist > ROUTE_DEVIATION_METERS && stops.length > 0) {
      console.log(`[DEVIATION] Vehicle ${vehicle.regNo} is ${Math.round(minDist)}m off route`);
      // Production: push to admin
    }
  }

  // ─── Live location (REST fallback for parent portal) ─────────────────────────

  async getActiveTripLocation(routeId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { routeId, status: "IN_PROGRESS" },
      include: { vehicle: true, driver: true },
    });
    if (!trip) return null;

    const latest = await this.prisma.tripLocationLog.findFirst({
      where: { tripId: trip.id },
      orderBy: { timestamp: "desc" },
    });

    return { trip, liveLocation: latest ?? null };
  }
}