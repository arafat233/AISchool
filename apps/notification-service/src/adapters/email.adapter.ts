import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailAdapter {
  private readonly logger = createLogger("EmailAdapter");
  private transporter: nodemailer.Transporter;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error("SENDGRID_API_KEY environment variable is not set");
    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: { user: "apikey", pass: apiKey },
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
