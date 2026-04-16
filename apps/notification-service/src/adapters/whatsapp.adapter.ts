import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import axios from "axios";

@Injectable()
export class WhatsappAdapter {
  private readonly logger = createLogger("WhatsappAdapter");

  async send(to: string, templateName: string, params: string[]): Promise<boolean> {
    try {
      await axios.post(`${process.env.WATI_BASE_URL}/api/v1/sendTemplateMessage`, {
        whatsappNumber: to.replace("+", ""),
        template_name: templateName,
        broadcast_name: templateName,
        parameters: params.map((v, i) => ({ name: `parameter${i + 1}`, value: v })),
      }, { headers: { Authorization: `Bearer ${process.env.WATI_API_KEY}` } });
      return true;
    } catch (e: any) {
      this.logger.error(`WhatsApp failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
