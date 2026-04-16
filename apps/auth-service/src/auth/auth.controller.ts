import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { SetupTotpVerifyDto } from "../dto/setup-totp-verify.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { Public } from "../decorators/public.decorator";
import { CurrentUser } from "../decorators/current-user.decorator";
import type { RequestUser } from "@school-erp/types";

const REFRESH_COOKIE = "erp_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/auth/refresh",
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip ?? "";
    const ua = req.headers["user-agent"] ?? "";
    const { accessToken, refreshToken } = await this.authService.login(dto, ip, ua);

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: "No refresh token" });
    }

    const { accessToken, refreshToken } = await this.authService.refreshTokens(rawToken, req.ip ?? "");
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) {
      await this.authService.logout(user.id, rawToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/auth/refresh" });
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: "If the email exists, a reset link has been sent." };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password reset successfully" };
  }

  // ─── 2FA ──────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post("2fa/setup")
  @HttpCode(HttpStatus.OK)
  async setupTotp(@CurrentUser() user: RequestUser) {
    return this.authService.setupTotp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  async verifyTotp(@CurrentUser() user: RequestUser, @Body() dto: SetupTotpVerifyDto) {
    await this.authService.verifyAndEnableTotp(user.id, dto.code);
    return { message: "2FA enabled successfully" };
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────
  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleAuth() {
    // Redirects to Google
  }

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(
    @Req() req: Request & { user: { email: string; provider: string; providerId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.handleOAuthLogin(
      req.user,
      req.ip ?? "",
      req.headers["user-agent"] ?? "",
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  // ─── Microsoft OAuth ───────────────────────────────────────────────────
  @Public()
  @Get("microsoft")
  @UseGuards(AuthGuard("microsoft"))
  microsoftAuth() {
    // Redirects to Microsoft
  }

  @Public()
  @Get("microsoft/callback")
  @UseGuards(AuthGuard("microsoft"))
  async microsoftCallback(
    @Req() req: Request & { user: { email: string; provider: string; providerId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.handleOAuthLogin(
      req.user,
      req.ip ?? "",
      req.headers["user-agent"] ?? "",
    );
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@CurrentUser() user: RequestUser) {
    return user;
  }
}
