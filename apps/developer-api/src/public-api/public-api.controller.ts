/**
 * Public REST API — exposes key ERP resources to third-party integrators.
 * All endpoints require x-api-key. Sandbox keys route to test data.
 */
import {
  Controller, Get, Param, Query, UseGuards, Req,
} from "@nestjs/common";
import {
  ApiTags, ApiSecurity, ApiOperation, ApiQuery, ApiParam,
} from "@nestjs/swagger";
import { ApiKeyGuard, ApiKeyContext } from "../auth/api-key.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("Students")
@ApiSecurity("ApiKeyAuth")
@UseGuards(ApiKeyGuard)
@Controller("students")
export class StudentsApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "List students for the authenticated school" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "classId", required: false, type: String })
  async listStudents(
    @Req() req: any,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Query("classId") classId?: string,
  ) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    const take = Math.min(Number(limit), 100);
    const skip = (Number(page) - 1) * take;
    return this.prisma.$queryRaw`
      SELECT s.id, s.full_name, s.admission_no, s.status, cl.name AS class_name, s.gender
      FROM students s
      JOIN classes cl ON cl.id = s.class_id
      WHERE s.school_id = ${ctx.schoolId}
        ${classId ? this.prisma.$queryRaw`AND s.class_id = ${classId}` : this.prisma.$queryRaw``}
      ORDER BY s.full_name
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a student by ID" })
  @ApiParam({ name: "id", description: "Student ID" })
  async getStudent(@Req() req: any, @Param("id") id: string) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT s.*, cl.name AS class_name
      FROM students s
      JOIN classes cl ON cl.id = s.class_id
      WHERE s.id = ${id} AND s.school_id = ${ctx.schoolId}
    `;
    return rows[0] ?? null;
  }
}

@ApiTags("Attendance")
@ApiSecurity("ApiKeyAuth")
@UseGuards(ApiKeyGuard)
@Controller("attendance")
export class AttendanceApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":studentId")
  @ApiOperation({ summary: "Get attendance records for a student" })
  @ApiQuery({ name: "from", required: false, type: String, description: "YYYY-MM-DD" })
  @ApiQuery({ name: "to", required: false, type: String, description: "YYYY-MM-DD" })
  async getAttendance(
    @Req() req: any,
    @Param("studentId") studentId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    const fromDate = from ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const toDate = to ?? new Date().toISOString().split("T")[0];
    return this.prisma.$queryRaw`
      SELECT date, status, source
      FROM attendance_records
      WHERE student_id = ${studentId}
        AND school_id = ${ctx.schoolId}
        AND date BETWEEN ${fromDate}::DATE AND ${toDate}::DATE
      ORDER BY date DESC
    `;
  }
}

@ApiTags("Fees")
@ApiSecurity("ApiKeyAuth")
@UseGuards(ApiKeyGuard)
@Controller("fees")
export class FeesApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":studentId")
  @ApiOperation({ summary: "Get fee invoices for a student" })
  async getFeeInvoices(@Req() req: any, @Param("studentId") studentId: string) {
    const ctx: ApiKeyContext = req.apiKeyContext;
    return this.prisma.$queryRaw`
      SELECT fi.id, fi.amount_rs, fi.due_date, fi.status, fh.name AS fee_head,
             COALESCE(SUM(fp.amount_rs), 0) AS paid_rs
      FROM fee_invoices fi
      LEFT JOIN fee_heads fh ON fh.id = fi.fee_head_id
      LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
      WHERE fi.student_id = ${studentId} AND fi.school_id = ${ctx.schoolId}
      GROUP BY fi.id, fh.name
      ORDER BY fi.due_date DESC
    `;
  }
}

// Combine into single controller file for module registration
@Controller()
export class PublicApiController {}
