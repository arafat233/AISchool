import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import axios from "axios";

@Injectable()
export class SmsAdapter {
  private readonly logger = createLogger("SmsAdapter");

  async send(to: string, message: string): Promise<boolean> {
    try {
      // MSG91 integration
      await axios.post("https://api.msg91.com/api/v5/flow/", {
        template_id: process.env.MSG91_TEMPLATE_ID,
        recipients: [{ mobiles: to.replace("+", ""), message }],
      }, { headers: { authkey: process.env.MSG91_AUTH_KEY, "content-type": "application/JSON" } });
      return true;
    } catch (e: any) {
      this.logger.error(`SMS failed to ${to}: ${e.message}`);
      return false;
    }
  }
}
