import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { TransportService } from "./transport.service";

@UseGuards(AuthGuard("jwt"))
@Controller()
export class TransportController {
  constructor(private readonly svc: TransportService) {}

  // ─── Routes ───────────────────────────────────────────────────────────────────

  @Post("routes")
  createRoute(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createRoute(req.user.schoolId!, body);
  }

  @Get("routes")
  getRoutes(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getRoutes(req.user.schoolId!);
  }

  @Post("routes/:id/stops")
  addStop(@Param("id") routeId: string, @Body() body: any) {
    return this.svc.addStop(routeId, body);
  }

  @Patch("stops/:id")
  updateStop(@Param("id") stopId: string, @Body() body: any) {
    return this.svc.updateStop(stopId, body);
  }

  @Delete("stops/:id")
  deleteStop(@Param("id") stopId: string) {
    return this.svc.deleteStop(stopId);
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────────

  @Post("vehicles")
  createVehicle(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createVehicle(req.user.schoolId!, {
      ...body,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
      fitnessExpiry:   body.fitnessExpiry   ? new Date(body.fitnessExpiry)   : undefined,
      pucExpiry:       body.pucExpiry       ? new Date(body.pucExpiry)       : undefined,
    });
  }

  @Get("vehicles")
  getVehicles(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getVehicles(req.user.schoolId!);
  }

  @Patch("vehicles/:id")
  updateVehicle(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateVehicle(id, body);
  }

  @Post("vehicles/:id/maintenance")
  addMaintenance(@Param("id") vehicleId: string, @Body() body: any) {
    return this.svc.addMaintenanceLog(vehicleId, {
      ...body,
      serviceDate: new Date(body.serviceDate),
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
    });
  }

  @Get("vehicles/:id/maintenance")
  getMaintenance(@Param("id") vehicleId: string) {
    return this.svc.getMaintenanceLogs(vehicleId);
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────────

  @Post("drivers")
  createDriver(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.createDriver(req.user.schoolId!, {
      ...body,
      licenceExpiry: body.licenceExpiry ? new Date(body.licenceExpiry) : undefined,
    });
  }

  @Get("drivers")
  getDrivers(@Req() req: Request & { user: RequestUser }) {
    return this.svc.getDrivers(req.user.schoolId!);
  }

  // ─── Student assignment ───────────────────────────────────────────────────────

  @Post("assignments")
  assignStudent(@Body() body: any) {
    return this.svc.assignStudent(body);
  }

  @Get("assignments/student/:studentId")
  getStudentAssignment(@Param("studentId") studentId: string) {
    return this.svc.getStudentAssignment(studentId);
  }

  // ─── Trips ────────────────────────────────────────────────────────────────────

  @Post("trips")
  startTrip(@Req() req: Request & { user: RequestUser }, @Body() body: any) {
    return this.svc.startTrip({ schoolId: req.user.schoolId!, ...body });
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
}
