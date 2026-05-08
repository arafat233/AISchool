import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailAdapter {
  private readonly logger = createLogger("EmailAdapter");
  private transporter!: nodemailer.Transporter;
  private ready = false;

  async init() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      this.transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        auth: { user: "apikey", pass: apiKey },
      });
      this.ready = true;
      this.logger.log("EmailAdapter: using SendGrid");
    } else {
      // Dev fallback: Ethereal test account
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.ready = true;
      this.logger.warn(`EmailAdapter: SENDGRID_API_KEY not set — using Ethereal test SMTP (${testAccount.user})`);
    }
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.ready) await this.init();
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@schoolerp.com",
        to,
        subject,
        html,
      });
      if (process.env.SENDGRID_API_KEY) {
        this.logger.log(`Email sent to ${to}`);
      } else {
        this.logger.log(`[DEV] Email preview: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (e: any) {
      this.logger.error(`Email failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
