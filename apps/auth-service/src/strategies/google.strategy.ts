import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || "not-configured",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error("No email returned from Google OAuth");

    return {
      email,
      provider: "google",
      providerId: profile.id,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
