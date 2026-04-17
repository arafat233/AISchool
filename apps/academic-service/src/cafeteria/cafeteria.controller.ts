import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CafeteriaService } from "./cafeteria.service";

@UseGuards(JwtAuthGuard)
@Controller("cafeteria")
export class CafeteriaController {
  constructor(private readonly svc: CafeteriaService) {}

  // ─── Menu management ──────────────────────────────────────────────────── [1/8]

  @Post(":schoolId/menu-items")
  createMenuItem(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.createMenuItem(schoolId, body);
  }

  @Get(":schoolId/menu-items")
  getMenuItems(@Param("schoolId") schoolId: string, @Query("mealType") mealType?: string) {
    return this.svc.getMenuItems(schoolId, mealType);
  }

  @Post(":schoolId/menu/day")
  publishDayMenu(@Param("schoolId") schoolId: string, @Body() body: { date: string; items: any[]; createdBy: string }) {
    return this.svc.publishDayMenu(schoolId, new Date(body.date), body.items, body.createdBy);
  }

  @Get(":schoolId/menu/day")
  getDayMenu(@Param("schoolId") schoolId: string, @Query("date") date: string) {
    return this.svc.getDayMenu(schoolId, new Date(date));
  }

  // ─── Pre-order system ─────────────────────────────────────────────────── [2/8]

  @Post(":schoolId/orders")
  placeOrder(@Param("schoolId") schoolId: string, @Body() body: { studentId: string; orderDate: string; items: any[] }) {
    return this.svc.placeOrder(schoolId, body.studentId, new Date(body.orderDate), body.items);
  }

  // ─── Allergen filter at POS ───────────────────────────────────────────── [3/8]

  @Get("pos/check-allergens")
  posCheckAllergens(@Query("studentId") studentId: string, @Query("menuItemId") menuItemId: string) {
    return this.svc.posCheckAllergens(studentId, menuItemId);
  }

  // ─── Student wallet ───────────────────────────────────────────────────── [4/8]

  @Get("wallet/:studentId")
  getWallet(@Param("studentId") studentId: string) {
    return this.svc.getOrCreateWallet(studentId);
  }

  @Post("wallet/:studentId/topup")
  topUpWallet(@Param("studentId") studentId: string, @Body() body: { amountRs: number; referenceId?: string }) {
    return this.svc.topUpWallet(studentId, body.amountRs, body.referenceId);
  }

  @Post("wallet/:studentId/threshold")
  setThreshold(@Param("studentId") studentId: string, @Body() body: { threshold: number }) {
    return this.svc.setLowBalanceThreshold(studentId, body.threshold);
  }

  // ─── POS billing ─────────────────────────────────────────────────────── [5/8]

  @Post(":schoolId/pos/bill")
  posBill(@Param("schoolId") schoolId: string, @Body() body: { studentId: string; items: any[] }) {
    return this.svc.posBill(schoolId, body.studentId, body.items);
  }

  // ─── Kitchen order summary ────────────────────────────────────────────── [6/8]

  @Get(":schoolId/kitchen-summary")
  getKitchenSummary(@Param("schoolId") schoolId: string, @Query("date") date: string) {
    return this.svc.getKitchenSummary(schoolId, new Date(date));
  }

  // ─── Monthly nutritional analysis ────────────────────────────────────── [7/8]

  @Get(":schoolId/nutrition/:studentId")
  getNutrition(
    @Param("schoolId") schoolId: string,
    @Param("studentId") studentId: string,
    @Query("month") month: string,
  ) {
    return this.svc.getNutritionalAnalysis(schoolId, studentId, month);
  }

  // ─── FSSAI compliance ─────────────────────────────────────────────────── [8/8]

  @Post(":schoolId/fssai")
  upsertFssai(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.upsertFssai(schoolId, body);
  }

  @Get(":schoolId/fssai")
  getFssai(@Param("schoolId") schoolId: string) {
    return this.svc.getFssai(schoolId);
  }

  @Post(":schoolId/fssai/staff-cert")
  addStaffCert(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.addFssaiStaffCert(schoolId, body);
  }

  @Post(":schoolId/fssai/checklist")
  submitChecklist(
    @Param("schoolId") schoolId: string,
    @Body() body: { month: string; items: any[]; completedBy: string },
  ) {
    return this.svc.submitSafetyChecklist(schoolId, body.month, body.items, body.completedBy);
  }

  @Post(":schoolId/fssai/sample")
  logSample(@Param("schoolId") schoolId: string, @Body() body: any) {
    return this.svc.logFoodSample(schoolId, {
      ...body,
      sampleDate: new Date(body.sampleDate),
      retainedUntil: new Date(body.retainedUntil),
    });
  }
}
