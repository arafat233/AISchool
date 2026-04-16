import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
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
  @UseInterceptors(FileInterceptor("file"))
  bulkImport(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
    @Query("academicYearId") academicYearId: string,
  ) {
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
