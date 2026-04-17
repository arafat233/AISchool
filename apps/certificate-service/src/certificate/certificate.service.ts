import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import * as QRCode from "qrcode";

function generateCertNo(schoolId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${schoolId.substring(0, 4).toUpperCase()}-${ts}-${rand}`;
}

// ─── Template variable injection ────────────────────────────────────────────────

function injectFields(template: string, fields: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => fields[key] ?? `{{${key}}}`);
}

@Injectable()
export class CertificateService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Template management ─────────────────────────────────────────────────────

  async createTemplate(schoolId: string, data: {
    name: string; certificateType: string; htmlTemplate: string;
    fieldMap: string[]; // list of {{variable}} names required
    logoUrl?: string; signatureLabel?: string;
  }) {
    return this.prisma.certificateTemplate.create({
      data: { schoolId, ...data, isActive: true },
    });
  }

  async updateTemplate(id: string, data: any) {
    return this.prisma.certificateTemplate.update({ where: { id }, data });
  }

  async getTemplates(schoolId: string, certificateType?: string) {
    return this.prisma.certificateTemplate.findMany({
      where: { schoolId, isActive: true, ...(certificateType ? { certificateType } : {}) },
      orderBy: { name: "asc" },
    });
  }

  // ─── Request workflow ─────────────────────────────────────────────────────────

  async createRequest(data: {
    schoolId: string; requestedBy: string;
    studentId?: string; staffId?: string;
    certificateType: string; purpose?: string; templateId?: string;
  }) {
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 2); // 2 working days SLA

    return this.prisma.certificateRequest.create({
      data: {
        schoolId: data.schoolId, requestedBy: data.requestedBy,
        studentId: data.studentId, staffId: data.staffId,
        certificateType: data.certificateType, purpose: data.purpose,
        templateId: data.templateId,
        slaDeadline, status: "PENDING",
      },
    });
  }

  async getRequests(schoolId: string, filters?: { status?: string; certificateType?: string }) {
    return this.prisma.certificateRequest.findMany({
      where: {
        schoolId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.certificateType ? { certificateType: filters.certificateType } : {}),
      },
      include: {
        student: { include: { user: { include: { profile: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveRequest(requestId: string, approvedBy: string) {
    return this.prisma.certificateRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedBy: approvedBy, reviewedAt: new Date() },
    });
  }

  async rejectRequest(requestId: string, rejectedBy: string, reason?: string) {
    return this.prisma.certificateRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy: rejectedBy, reviewedAt: new Date(), rejectionReason: reason },
    });
  }

  // ─── Issue certificate ────────────────────────────────────────────────────────

  async issueCertificate(data: {
    schoolId: string; requestId?: string; templateId?: string;
    studentId?: string; staffId?: string;
    certificateType: string; fields: Record<string, string>;
    issuedBy: string; dscUrl?: string;
    publicVerifyBaseUrl?: string;
  }) {
    const certNo = generateCertNo(data.schoolId);
    const verifyUrl = `${data.publicVerifyBaseUrl ?? "https://verify.school-erp.app"}/verify/${certNo}`;

    // Generate QR code pointing to verification URL
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 128, margin: 1 });

    let htmlContent: string | null = null;
    if (data.templateId) {
      const template = await this.prisma.certificateTemplate.findUnique({ where: { id: data.templateId } });
      if (template) {
        htmlContent = injectFields(template.htmlTemplate, {
          ...data.fields,
          certNo,
          qrCode: `<img src="${qrDataUrl}" alt="QR" width="80"/>`,
          issuedDate: new Date().toLocaleDateString("en-IN"),
          dscSignature: data.dscUrl ? `<img src="${data.dscUrl}" alt="Digital Signature" height="40"/>` : "",
        });
      }
    }

    const cert = await this.prisma.issuedCertificate.create({
      data: {
        schoolId: data.schoolId,
        studentId: data.studentId,
        staffId: data.staffId,
        certificateType: data.certificateType as any,
        certNo,
        title: data.fields.title ?? data.certificateType,
        data: data.fields,
        qrCode: certNo, // store certNo for QR lookup
        issuedBy: data.issuedBy,
      },
    });

    // Update request as issued
    if (data.requestId) {
      await this.prisma.certificateRequest.update({
        where: { id: data.requestId },
        data: { status: "ISSUED", issuedCertificateId: cert.id },
      });
    }

    return { ...cert, qrDataUrl, htmlContent, verifyUrl };
  }

  // ─── Public verification ──────────────────────────────────────────────────────

  async verifyCertificate(certNo: string) {
    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { certNo },
      include: { student: { include: { user: { include: { profile: true } } } } },
    });
    if (!cert) return { valid: false, message: "Certificate not found" };
    if (cert.revokedAt) return { valid: false, message: "This certificate has been revoked", revokedAt: cert.revokedAt };

    const profile: any = (cert.student as any)?.user?.profile;
    return {
      valid: true,
      certNo: cert.certNo,
      certificateType: cert.certificateType,
      issuedAt: cert.issuedAt,
      schoolId: cert.schoolId,
      holderName: profile ? `${profile.firstName} ${profile.lastName}` : "Staff Member",
      title: cert.title,
    };
  }

  // ─── Revocation ───────────────────────────────────────────────────────────────

  async revokeCertificate(certNo: string, revokedBy: string, reason?: string) {
    const cert = await this.prisma.issuedCertificate.findUnique({ where: { certNo } });
    if (!cert) throw new NotFoundError("Certificate not found");
    if (cert.revokedAt) throw new ConflictError("Certificate already revoked");

    return this.prisma.issuedCertificate.update({
      where: { certNo },
      data: { revokedAt: new Date(), data: { ...(cert.data as any), revokedBy, revokedReason: reason } },
    });
  }

  // ─── DigiLocker push (stub — real implementation needs DigiLocker API OAuth) ──

  async pushToDigiLocker(certNo: string): Promise<{ status: string; message: string }> {
    const cert = await this.prisma.issuedCertificate.findUnique({ where: { certNo } });
    if (!cert) throw new NotFoundError("Certificate not found");
    if (cert.revokedAt) throw new ConflictError("Cannot push revoked certificate");

    // In production: call DigiLocker Issuer API with OAuth2
    // POST https://api.digitallocker.gov.in/public/oauth2/1/file/upload
    return {
      status: "QUEUED",
      message: "DigiLocker push queued. Document will appear in student's locker within 2-4 hours.",
    };
  }

  // ─── Generate HTML for PDF ────────────────────────────────────────────────────

  async generateCertificateHtml(certNo: string): Promise<string> {
    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { certNo },
      include: { student: { include: { user: { include: { profile: true } } } } },
    });
    if (!cert) throw new NotFoundError("Certificate not found");

    const fields: any = cert.data;
    const profile: any = (cert.student as any)?.user?.profile;
    const holderName = fields.studentName ?? (profile ? `${profile.firstName} ${profile.lastName}` : "");
    const qrDataUrl = await QRCode.toDataURL(`https://verify.school-erp.app/verify/${cert.certNo}`, { width: 128 });

    return `<!DOCTYPE html>
<html><head><style>
body{font-family:"Times New Roman",serif;margin:40px;background:#fff}
.letterhead{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px}
.school-name{font-size:24px;font-weight:bold}
.cert-title{font-size:20px;text-align:center;text-transform:uppercase;margin:20px 0;text-decoration:underline}
.content{font-size:14px;line-height:2;text-align:justify}
.footer{margin-top:60px;display:flex;justify-content:space-between}
.qr{position:absolute;top:40px;right:40px}
.cert-no{font-size:10px;color:#666;text-align:right}
</style></head>
<body>
<div class="letterhead">
  <div class="school-name">${fields.schoolName ?? "SCHOOL NAME"}</div>
  <div>${fields.schoolAddress ?? ""}</div>
  <div>Tel: ${fields.schoolPhone ?? ""} | Email: ${fields.schoolEmail ?? ""}</div>
</div>
<div class="cert-no">Cert No: ${cert.certNo}</div>
<div class="cert-title">${cert.title ?? cert.certificateType}</div>
<div class="content">
  <p>This is to certify that <strong>${holderName}</strong>${fields.additionalInfo ? `, ${fields.additionalInfo}` : ""}.</p>
  ${fields.body ? `<p>${fields.body}</p>` : ""}
  <p>Issued on ${new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}.</p>
</div>
<div class="footer">
  <div>${fields.principalName ?? "Principal"}<br/><small>${fields.schoolName ?? ""}</small></div>
  <div><img src="${qrDataUrl}" width="80"/><br/><small>Scan to verify</small></div>
</div>
</body></html>`;
  }
}
