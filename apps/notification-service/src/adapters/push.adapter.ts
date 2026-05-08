import { Injectable } from "@nestjs/common";
import { createLogger } from "@school-erp/logger";
import * as admin from "firebase-admin";

@Injectable()
export class PushAdapter {
  private readonly logger = createLogger("PushAdapter");
  private initialized = false;

  private init() {
    if (!this.initialized && process.env.FCM_PROJECT_ID) {
      try {
        const credential = admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          clientEmail: process.env.FCM_CLIENT_EMAIL,
        });
        admin.initializeApp({ credential });
        this.initialized = true;
      } catch (e: any) {
        this.logger.error(`Firebase initialization failed: ${e.message}`);
      }
    }
  }

  async send(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<{ success: boolean; tokenExpired?: boolean }> {
    this.init();
    if (!this.initialized) return { success: false };
    try {
      await admin.messaging().send({ token: fcmToken, notification: { title, body }, data });
      return { success: true };
    } catch (e: any) {
      const expired =
        e.code === "messaging/registration-token-not-registered" ||
        e.code === "messaging/invalid-registration-token";
      if (expired) {
        this.logger.warn(`FCM token expired or invalid — should be removed: ${fcmToken.slice(0, 12)}...`);
        return { success: false, tokenExpired: true };
      }
      this.logger.error(`Push failed: ${e.message}`);
      return { success: false };
    }
  }
}
