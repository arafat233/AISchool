import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailAdapter {
  private readonly logger = createLogger("EmailAdapter");
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY },
    });
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({ from: process.env.SENDGRID_FROM_EMAIL || "noreply@schoolerp.com", to, subject, html });
      return true;
    } catch (e: any) {
      this.logger.error(`Email failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
