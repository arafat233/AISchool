/**
 * School Magazine & Digital Yearbook
 *
 * Magazine builder (student articles + teacher editorial),
 * Digital yearbook (photos, superlatives, senior farewell),
 * Photo gallery per event, archive of past issues.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type PublicationStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED";
export type ArticleStatus = "SUBMITTED" | "EDITOR_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";

@Injectable()
export class MagazineService {
  private readonly logger = new Logger(MagazineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Magazine ──────────────────────────────────────────────────────────────

  async createMagazineIssue(schoolId: string, issue: {
    title: string;
    volume: number;
    issueNumber: number;
    academicYear: string;
    editorTeacherId: string;
    targetPublishDate: Date;
  }): Promise<string> {
    const issueId = `MAG-${schoolId.slice(0, 4).toUpperCase()}-VOL${issue.volume}-IS${issue.issueNumber}`;
    await this.prisma.$executeRaw`
      INSERT INTO magazine_issues (id, school_id, title, volume, issue_number, academic_year,
        editor_teacher_id, target_publish_date, status, created_at)
      VALUES (${issueId}, ${schoolId}, ${issue.title}, ${issue.volume}, ${issue.issueNumber},
              ${issue.academicYear}, ${issue.editorTeacherId}, ${issue.targetPublishDate}, 'DRAFT', NOW())
    `;
    return issueId;
  }

  async submitArticle(issueId: string, article: {
    authorStudentId: string;
    title: string;
    content: string;
    category: "STORY" | "POEM" | "ESSAY" | "INTERVIEW" | "COMIC" | "PHOTO_ESSAY" | "EDITORIAL";
    attachmentUrls: string[];
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO magazine_articles (issue_id, author_student_id, title, content, category,
        attachment_urls, status, submitted_at)
      VALUES (${issueId}, ${article.authorStudentId}, ${article.title}, ${article.content},
              ${article.category}, ${JSON.stringify(article.attachmentUrls)}, 'SUBMITTED', NOW())
    `;
  }

  async reviewArticle(articleId: string, editorId: string, status: ArticleStatus, feedback?: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE magazine_articles
      SET status = ${status}, editor_id = ${editorId}, editor_feedback = ${feedback ?? null}, reviewed_at = NOW()
      WHERE id = ${articleId}
    `;
  }

  async publishMagazine(issueId: string, publishedUrl: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE magazine_issues SET status = 'PUBLISHED', published_url = ${publishedUrl}, published_at = NOW()
      WHERE id = ${issueId}
    `;
    this.logger.log(`Magazine issue ${issueId} published: ${publishedUrl}`);
  }

  async getMagazineArchive(schoolId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT mi.*, COUNT(ma.id) AS article_count
      FROM magazine_issues mi
      LEFT JOIN magazine_articles ma ON ma.issue_id = mi.id AND ma.status = 'APPROVED'
      WHERE mi.school_id = ${schoolId}
      GROUP BY mi.id
      ORDER BY mi.volume DESC, mi.issue_number DESC
    `;
  }

  // ── Digital Yearbook ──────────────────────────────────────────────────────

  async createYearbook(schoolId: string, yearbook: {
    academicYear: string;
    title: string;
    editorTeacherId: string;
    gradYear: number;
    printOrderDeadline?: Date;
  }): Promise<string> {
    const yearbookId = `YB-${schoolId.slice(0, 4).toUpperCase()}-${yearbook.gradYear}`;
    await this.prisma.$executeRaw`
      INSERT INTO yearbooks (id, school_id, academic_year, title, editor_teacher_id, grad_year,
        print_order_deadline, status, created_at)
      VALUES (${yearbookId}, ${schoolId}, ${yearbook.academicYear}, ${yearbook.title},
              ${yearbook.editorTeacherId}, ${yearbook.gradYear},
              ${yearbook.printOrderDeadline ?? null}, 'DRAFT', NOW())
    `;
    return yearbookId;
  }

  async submitYearbookPhoto(yearbookId: string, studentId: string, photoS3Key: string, caption?: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO yearbook_photos (yearbook_id, student_id, photo_s3_key, caption, approved, submitted_at)
      VALUES (${yearbookId}, ${studentId}, ${photoS3Key}, ${caption ?? null}, false, NOW())
      ON CONFLICT (yearbook_id, student_id) DO UPDATE
        SET photo_s3_key = ${photoS3Key}, caption = ${caption ?? null}, approved = false
    `;
  }

  async recordSuperlativeVote(yearbookId: string, voterId: string, category: string, nomineeStudentId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO yearbook_superlative_votes (yearbook_id, voter_id, category, nominee_student_id, voted_at)
      VALUES (${yearbookId}, ${voterId}, ${category}, ${nomineeStudentId}, NOW())
      ON CONFLICT (yearbook_id, voter_id, category) DO UPDATE
        SET nominee_student_id = ${nomineeStudentId}, voted_at = NOW()
    `;
  }

  async getSuperlativeResults(yearbookId: string): Promise<any[]> {
    return this.prisma.$queryRaw`
      SELECT v.category, v.nominee_student_id, s.full_name AS nominee_name,
             COUNT(*) AS vote_count,
             RANK() OVER (PARTITION BY v.category ORDER BY COUNT(*) DESC) AS rank
      FROM yearbook_superlative_votes v
      JOIN students s ON s.id = v.nominee_student_id
      WHERE v.yearbook_id = ${yearbookId}
      GROUP BY v.category, v.nominee_student_id, s.full_name
      HAVING RANK() OVER (PARTITION BY v.category ORDER BY COUNT(*) DESC) = 1
    `;
  }

  async addPrintOrder(yearbookId: string, studentId: string, copies: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO yearbook_print_orders (yearbook_id, student_id, copies, amount_rs, status, ordered_at)
      VALUES (${yearbookId}, ${studentId}, ${copies}, ${copies * 350}, 'PENDING', NOW())
      ON CONFLICT (yearbook_id, student_id) DO UPDATE SET copies = ${copies}
    `;
  }

  // ── Event Photo Gallery ────────────────────────────────────────────────────

  async createEventGallery(schoolId: string, eventId: string, gallery: {
    title: string;
    uploadedByStaffId: string;
    photos: { s3Key: string; caption?: string }[];
    requiresParentConsent: boolean;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO event_galleries (school_id, event_id, title, uploaded_by, requires_parent_consent,
        photo_count, status, created_at)
      VALUES (${schoolId}, ${eventId}, ${gallery.title}, ${gallery.uploadedByStaffId},
              ${gallery.requiresParentConsent}, ${gallery.photos.length}, 'PENDING_REVIEW', NOW())
    `;

    for (const photo of gallery.photos) {
      await this.prisma.$executeRaw`
        INSERT INTO gallery_photos (school_id, event_id, s3_key, caption, consent_verified, uploaded_at)
        VALUES (${schoolId}, ${eventId}, ${photo.s3Key}, ${photo.caption ?? null}, false, NOW())
      `;
    }
  }

  async publishGallery(galleryId: string, reviewedByStaffId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE event_galleries SET status = 'PUBLISHED', reviewed_by = ${reviewedByStaffId}, published_at = NOW()
      WHERE id = ${galleryId}
    `;
  }
}
