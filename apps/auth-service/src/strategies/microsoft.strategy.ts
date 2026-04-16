import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { IProfile, OIDCStrategy } from "passport-microsoft";

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OIDCStrategy as any, "microsoft") {
  constructor() {
    super({
      clientID: process.env.MS_CLIENT_ID || "not-configured",
      clientSecret: process.env.MS_CLIENT_SECRET || "not-configured",
      callbackURL: process.env.MS_CALLBACK_URL || "http://localhost:3001/auth/microsoft/callback",
      scope: ["user.read"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: IProfile) {
    const email =
      profile._json?.mail ||
      profile._json?.userPrincipalName ||
      profile.emails?.[0]?.value;

    if (!email) throw new Error("No email returned from Microsoft OAuth");

    return {
      email,
      provider: "microsoft",
      providerId: profile.id,
    };
  }
}
