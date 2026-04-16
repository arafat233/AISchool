import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import * as admin from "firebase-admin";

@Injectable()
export class PushAdapter {
  private readonly logger = createLogger("PushAdapter");
  private initialized = false;

  private init() {
    if (!this.initialized && process.env.FCM_PROJECT_ID) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FCM_PROJECT_ID, privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"), clientEmail: process.env.FCM_CLIENT_EMAIL }) });
      this.initialized = true;
    }
  }

  async send(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    this.init();
    if (!this.initialized) return false;
    try {
      await admin.messaging().send({ token: fcmToken, notification: { title, body }, data });
      return true;
    } catch (e: any) {
      this.logger.error(`Push failed: ${e.message}`);
      return false;
    }
  }
}
