import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";

export type ContentType = "VIDEO" | "PDF" | "ARTICLE" | "AUDIO" | "LIVE_CLASS" | "AR_CONTENT";

// ─── Course & Content CRUD ───────────────────────────────────────────────────

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Courses ──────────────────────────────────────────────────────────────────

  async createCourse(schoolId: string, data: {
    title: string; description?: string; subjectId: string; gradeLevelId: string;
    thumbnailUrl?: string; teacherStaffId?: string;
  }) {
    return this.prisma.course.create({ data: { schoolId, ...data } });
  }

  async getCourses(schoolId: string, filters?: { subjectId?: string; gradeLevelId?: string }) {
    return this.prisma.course.findMany({
      where: { schoolId, ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}), ...(filters?.gradeLevelId ? { gradeLevelId: filters.gradeLevelId } : {}) },
      include: { subject: true, gradeLevel: true, _count: { select: { units: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { units: { include: { lessons: { orderBy: { orderIndex: "asc" } } }, orderBy: { orderIndex: "asc" } } },
    });
    if (!course) throw new NotFoundError("Course not found");
    return course;
  }

  // ── Units ─────────────────────────────────────────────────────────────────────

  async createUnit(courseId: string, data: { title: string; description?: string }) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundError("Course not found");
    const lastUnit = await this.prisma.courseUnit.findFirst({ where: { courseId }, orderBy: { orderIndex: "desc" } });
    return this.prisma.courseUnit.create({
      data: { courseId, title: data.title, description: data.description, orderIndex: (lastUnit?.orderIndex ?? 0) + 1 },
    });
  }

  async reorderUnits(courseId: string, orderedIds: string[]) {
    const ops = orderedIds.map((id, i) =>
      this.prisma.courseUnit.update({ where: { id }, data: { orderIndex: i + 1 } }),
    );
    return this.prisma.$transaction(ops);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────────

  async createLesson(unitId: string, data: {
    title: string; type: ContentType;
    contentUrl?: string;   // video URL, PDF URL, AR content URL
    articleHtml?: string;  // for ARTICLE type
    durationSeconds?: number;
    description?: string;
    isFreePreview?: boolean;
  }) {
    const unit = await this.prisma.courseUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundError("Unit not found");
    const lastLesson = await this.prisma.lesson.findFirst({ where: { unitId }, orderBy: { orderIndex: "desc" } });
    return this.prisma.lesson.create({
      data: { unitId, title: data.title, type: data.type, contentUrl: data.contentUrl, articleHtml: data.articleHtml, durationSeconds: data.durationSeconds ?? 0, description: data.description, isFreePreview: data.isFreePreview ?? false, orderIndex: (lastLesson?.orderIndex ?? 0) + 1 },
    });
  }

  async updateLesson(id: string, data: Partial<{ title: string; contentUrl: string; articleHtml: string; durationSeconds: number; description: string; isFreePreview: boolean; recordingUrl: string }>) {
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async deleteLesson(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }

  // ── eTextbook Embed ──────────────────────────────────────────────────────────

  async createETextbookEmbed(unitId: string, data: { title: string; iframeUrl: string; chapterLink?: string }) {
    return this.createLesson(unitId, {
      title: data.title,
      type: "ARTICLE",
      contentUrl: data.chapterLink,
      articleHtml: `<iframe src="${data.iframeUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`,
      description: "NCERT / eTextbook embed",
    });
  }

  // ── Quiz linked to Question Bank ─────────────────────────────────────────────

  async attachQuiz(lessonId: string, data: { onlineTestId: string; maxAttempts?: number; passScore?: number }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundError("Lesson not found");

    const existing = await this.prisma.lessonQuiz.findUnique({ where: { lessonId } });
    if (existing) throw new ConflictError("Quiz already attached to this lesson");

    return this.prisma.lessonQuiz.create({
      data: { lessonId, onlineTestId: data.onlineTestId, maxAttempts: data.maxAttempts ?? 3, passScore: data.passScore ?? 60 },
    });
  }

  // ── Discussion Threads ───────────────────────────────────────────────────────

  async createDiscussion(lessonId: string, authorId: string, data: { content: string; parentId?: string }) {
    return this.prisma.lessonDiscussion.create({
      data: { lessonId, authorId, content: data.content, parentId: data.parentId },
      include: { author: true },
    });
  }

  async getDiscussions(lessonId: string) {
    return this.prisma.lessonDiscussion.findMany({
      where: { lessonId, parentId: null },   // top-level only
      include: {
        author: true,
        replies: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async moderateDiscussion(id: string, action: "APPROVE" | "REMOVE") {
    return this.prisma.lessonDiscussion.update({
      where: { id },
      data: { moderationStatus: action },
    });
  }
}
