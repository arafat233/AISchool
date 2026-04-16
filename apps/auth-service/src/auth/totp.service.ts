import { Injectable } from "@nestjs/common";
import * as speakeasy from "speakeasy";

@Injectable()
export class TotpService {
  private get issuer() {
    return process.env.TOTP_ISSUER || "SchoolERP";
  }

  generateSecret(userEmail: string): { secret: string; otpauthUrl: string } {
    const secretObj = speakeasy.generateSecret({
      name: `${this.issuer}:${userEmail}`,
      issuer: this.issuer,
      length: 32,
    });

    return {
      secret: secretObj.base32,
      otpauthUrl: secretObj.otpauth_url ?? "",
    };
  }

  verify(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1, // allow 30s clock drift
    });
  }

  generateCurrentToken(secret: string): string {
    return speakeasy.totp({ secret, encoding: "base32" });
  }
}
