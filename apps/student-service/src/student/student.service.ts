import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import { parsePagination, buildPaginatedResult, generateAdmissionNumber } from "@school-erp/utils";
import type { PaginationQuery } from "@school-erp/types";
import { CreateStudentDto } from "../dto/create-student.dto";
import { UpdateStudentDto } from "../dto/update-student.dto";
import { PromoteStudentDto } from "../dto/promote-student.dto";
import { parse } from "csv-parse/sync";

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string, tenantId: string, dto: CreateStudentDto) {
    // Check duplicate admission number
    const existing = await this.prisma.student.findFirst({
      where: { schoolId, admissionNo: dto.admissionNo },
    });
    if (existing) throw new ConflictError(`Admission number ${dto.admissionNo} already exists`);

    const student = await this.prisma.student.create({
      data: {
        schoolId,
        admissionNo: dto.admissionNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender as any,
        sectionId: dto.sectionId,
        academicYearId: dto.academicYearId,
        admissionDate: new Date(dto.admissionDate ?? new Date()),
        bloodGroup: dto.bloodGroup,
        nationality: dto.nationality ?? "Indian",
        religion: dto.religion,
        category: dto.category,
        motherTongue: dto.motherTongue,
        aadharNo: dto.aadharNo,
        isRTE: dto.isRTE ?? false,
        transportRequired: dto.transportRequired ?? false,
      },
      include: { section: { include: { gradeLevel: true } } },
    });
    return student;
  }

  async findAll(schoolId: string, query: PaginationQuery & { sectionId?: string; gradeLevelId?: string }) {
    const { skip, take, page, limit } = parsePagination(query);
    const where: any = { schoolId };
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { admissionNo: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take,
        include: { section: { include: { gradeLevel: true } } },
        orderBy: [{ section: { gradeLevel: { numericLevel: "asc" } } }, { firstName: "asc" }],
      }),
      this.prisma.student.count({ where }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, schoolId: string) {
    const s = await this.prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        section: { include: { gradeLevel: true } },
        parents: { include: { user: { include: { profile: true } } } },
        documents: true,
      },
    });
    if (!s) throw new NotFoundError("Student", id);
    return s;
  }

  async update(id: string, schoolId: string, dto: UpdateStudentDto) {
    await this.findOne(id, schoolId);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.sectionId && { sectionId: dto.sectionId }),
        ...(dto.bloodGroup && { bloodGroup: dto.bloodGroup }),
        ...(dto.transportRequired !== undefined && { transportRequired: dto.transportRequired }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.address && { address: dto.address }),
      },
    });
  }

  async promote(dto: PromoteStudentDto) {
    // Bulk promote: move students from one section to another in new academic year
    const promotions = dto.promotions.map((p) =>
      this.prisma.student.update({
        where: { id: p.studentId },
        data: { sectionId: p.newSectionId, academicYearId: dto.newAcademicYearId },
      }),
    );
    await this.prisma.$transaction(promotions);

    // Record in ClassPromotion table
    await this.prisma.classPromotion.createMany({
      data: dto.promotions.map((p) => ({
        studentId: p.studentId,
        fromSectionId: p.fromSectionId,
        toSectionId: p.newSectionId,
        fromAcademicYearId: dto.currentAcademicYearId,
        toAcademicYearId: dto.newAcademicYearId,
        promotedById: dto.promotedById,
      })),
    });

    return { promoted: dto.promotions.length };
  }

  async bulkImport(schoolId: string, csvBuffer: Buffer, academicYearId: string) {
    const records = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true }) as any[];

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of records) {
      try {
        const section = await this.prisma.section.findFirst({
          where: { schoolId, name: row.section, gradeLevel: { name: row.grade } },
        });
        if (!section) throw new Error(`Section ${row.grade}-${row.section} not found`);

        await this.create(schoolId, "", {
          admissionNo: row.admission_no,
          firstName: row.first_name,
          lastName: row.last_name,
          dateOfBirth: row.date_of_birth,
          gender: row.gender,
          sectionId: section.id,
          academicYearId,
        });
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Row ${row.admission_no || "?"}: ${e.message}`);
      }
    }
    return results;
  }

  async linkParent(studentId: string, parentUserId: string, schoolId: string) {
    await this.findOne(studentId, schoolId);
    await this.prisma.studentParent.upsert({
      where: { studentId_userId: { studentId, userId: parentUserId } },
      update: {},
      create: { studentId, userId: parentUserId, relation: "PARENT" },
    });
  }

  async issueTC(studentId: string, schoolId: string, issuedById: string) {
    const student = await this.findOne(studentId, schoolId);
    const tc = await this.prisma.transferCertificate.create({
      data: {
        studentId,
        schoolId,
        issueDate: new Date(),
        issuedById,
        tcNo: `TC/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      },
    });

    await this.prisma.student.update({ where: { id: studentId }, data: { status: "LEFT" as any } });
    return tc;
  }
}
