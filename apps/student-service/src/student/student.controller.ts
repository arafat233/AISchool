import {
  BadRequestException, Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";

const CSV_MAGIC = [0xef, 0xbb, 0xbf]; // UTF-8 BOM (optional) or plain text
const MAX_CSV_SIZE = 2 * 1024 * 1024; // 2 MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { StudentService } from "./student.service";
import { CreateStudentDto } from "../dto/create-student.dto";
import { UpdateStudentDto } from "../dto/update-student.dto";
import { PromoteStudentDto } from "../dto/promote-student.dto";
import { LinkParentDto } from "../dto/link-parent.dto";
import { ListStudentsQueryDto } from "../dto/list-students-query.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("students")
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateStudentDto) {
    return this.studentService.create(req.user.schoolId!, req.user.tenantId, dto);
  }

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }, @Query() query: ListStudentsQueryDto) {
    return this.studentService.findAll(req.user.schoolId!, query);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.studentService.findOne(id, req.user.schoolId!);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, req.user.schoolId!, dto);
  }

  @Post("promote")
  @HttpCode(HttpStatus.OK)
  promote(@Body() dto: PromoteStudentDto) {
    return this.studentService.promote(dto);
  }

  @Post("bulk-import")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_CSV_SIZE } }))
  bulkImport(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
    @Query("academicYearId") academicYearId: string,
  ) {
    if (!file) throw new BadRequestException("CSV file required");
    if (!academicYearId || !UUID_RE.test(academicYearId)) {
      throw new BadRequestException("academicYearId must be a valid UUID");
    }
    // Accept text/csv or application/vnd.ms-excel; reject anything binary
    const declaredMime = file.mimetype ?? "";
    if (!declaredMime.includes("csv") && !declaredMime.includes("text")) {
      throw new BadRequestException("Only CSV files are accepted");
    }
    return this.studentService.bulkImport(req.user.schoolId!, file.buffer, academicYearId);
  }

  @Post(":id/link-parent")
  @HttpCode(HttpStatus.NO_CONTENT)
  linkParent(@Param("id") id: string, @Req() req: Request & { user: RequestUser }, @Body() dto: LinkParentDto) {
    return this.studentService.linkParent(id, dto.parentUserId, req.user.schoolId!);
  }

  @Post(":id/tc")
  issueTC(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.studentService.issueTC(id, req.user.schoolId!, req.user.id);
  }

  @Get("health")
  health() { return { status: "ok", service: "student-service" }; }
}
