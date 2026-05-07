import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { TransportService } from "./transport.service";
import {
  CreateRouteDto, AddStopDto, UpdateStopDto, CreateVehicleDto, UpdateVehicleDto,
  AddMaintenanceDto, CreateDriverDto, AssignStudentDto, StartTripDto,
} from "./dto/transport.dto";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class TransportController {
  constructor(private readonly svc: TransportService) {}

  // ─── Routes ───────────────────────────────────────────────────────────────────

  @Post("routes")
  createRoute(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateRouteDto) {
    return this.svc.createRoute(req.user.schoolId!, dto);
  }

  @Get("routes")
  getRoutes(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getRoutes(req.user.schoolId!);
  }

  @Post("routes/:id/stops")
  addStop(@Param("id") routeId: string, @Body() dto: AddStopDto) {
    return this.svc.addStop(routeId, dto);
  }

  @Patch("stops/:id")
  updateStop(@Param("id") stopId: string, @Body() dto: UpdateStopDto) {
    return this.svc.updateStop(stopId, dto);
  }

  @Delete("stops/:id")
  deleteStop(@Param("id") stopId: string) {
    return this.svc.deleteStop(stopId);
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────────

  @Post("vehicles")
  createVehicle(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateVehicleDto) {
    return this.svc.createVehicle(req.user.schoolId!, {
      ...dto,
      insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
      fitnessExpiry:   dto.fitnessExpiry   ? new Date(dto.fitnessExpiry)   : undefined,
      pucExpiry:       dto.pucExpiry       ? new Date(dto.pucExpiry)       : undefined,
    });
  }

  @Get("vehicles")
  getVehicles(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getVehicles(req.user.schoolId!);
  }

  @Patch("vehicles/:id")
  updateVehicle(@Param("id") id: string, @Body() dto: UpdateVehicleDto) {
    return this.svc.updateVehicle(id, dto);
  }

  @Post("vehicles/:id/maintenance")
  addMaintenance(@Param("id") vehicleId: string, @Body() dto: AddMaintenanceDto) {
    return this.svc.addMaintenanceLog(vehicleId, {
      ...dto,
      serviceDate: new Date(dto.serviceDate),
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
    });
  }

  @Get("vehicles/:id/maintenance")
  getMaintenance(@Param("id") vehicleId: string) {
    return this.svc.getMaintenanceLogs(vehicleId);
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────────

  @Post("drivers")
  createDriver(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateDriverDto) {
    return this.svc.createDriver(req.user.schoolId!, {
      ...dto,
      licenceExpiry: dto.licenceExpiry ? new Date(dto.licenceExpiry) : undefined,
    });
  }

  @Get("drivers")
  getDrivers(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getDrivers(req.user.schoolId!);
  }

  // ─── Student assignment ───────────────────────────────────────────────────────

  @Post("assignments")
  assignStudent(@Body() dto: AssignStudentDto) {
    return this.svc.assignStudent(dto);
  }

  @Get("assignments/student/:studentId")
  getStudentAssignment(@Param("studentId") studentId: string) {
    return this.svc.getStudentAssignment(studentId);
  }

  // ─── Trips ────────────────────────────────────────────────────────────────────

  @Post("trips")
  startTrip(@Req() req: Request & { user: RequestUser }, @Body() dto: StartTripDto) {
    return this.svc.startTrip({ schoolId: req.user.schoolId!, ...dto });
  }

  @Post("trips/:id/end")
  endTrip(@Param("id") id: string, @Body("incidentNotes") notes?: string) {
    return this.svc.endTrip(id, notes);
  }

  @Get("trips")
  getTrips(@Req() req: Request & { user: RequestUser }, @Query("date") date?: string) {
    return this.svc.getTrips(req.user.schoolId!, date ? new Date(date) : undefined);
  }

  @Get("trips/:id/history")
  getTripHistory(@Param("id") id: string) {
    return this.svc.getTripHistory(id);
  }

  // ─── Live location (parent portal REST fallback) ──────────────────────────────

  @Get("routes/:id/live")
  getLiveLocation(@Param("id") routeId: string) {
    return this.svc.getActiveTripLocation(routeId);
  }

  // ─── Student's transport info (parent portal) ─────────────────────────────────

  @Get("student/:studentId")
  getStudentTransport(@Param("studentId") studentId: string) {
    return this.svc.getStudentAssignment(studentId);
  }

  // ─── Health ───────────────────────────────────────────────────────────────────

  @Get("health")
  health() { return { status: "ok", service: "transport-service" }; }
}
