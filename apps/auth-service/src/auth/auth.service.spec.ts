import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";
import {
  AccountDisabledError,
  InvalidCredentialsError,
  InvalidOtpError,
  TwoFactorRequiredError,
} from "@school-erp/errors";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@school-erp/utils", () => ({
  generateOtp: jest.fn().mockReturnValue("123456"),
  generateSecureToken: jest.fn().mockReturnValue("secure-reset-token-abc123"),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  school: {
    findFirst: jest.fn(),
  },
  tenant: {
    findUniqueOrThrow: jest.fn(),
  },
  twoFactorAuth: {
    upsert: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const mockTokenService = {
  generateTokenPair: jest.fn(),
  revokeRefreshToken: jest.fn(),
  refreshAccessToken: jest.fn(),
};

const mockTotpService = {
  generateSecret: jest.fn(),
  verify: jest.fn(),
  generateCurrentToken: jest.fn(),
};

// ── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  email: "test@school.com",
  passwordHash: "$2b$12$hashedpassword",
  isActive: true,
  role: "TEACHER",
  tenantId: "tenant-1",
  twoFactor: null,
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "PrismaService", useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
        { provide: TotpService, useValue: mockTotpService },
      ],
    })
      .overrideProvider("PrismaService")
      .useValue(mockPrisma)
      .compile();

    // Manually construct to avoid DI token issues with @school-erp/database
    service = new AuthService(mockPrisma as any, mockTokenService as any, mockTotpService as any);
  });

  // ── validateLocalUser ────────────────────────────────────────────────────

  describe("validateLocalUser", () => {
    it("throws InvalidCredentialsError when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateLocalUser("ghost@school.com", "pass")).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "ghost@school.com" } }),
      );
    });

    it("throws AccountDisabledError when account is disabled", async () => {
      const user = makeUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      await expect(service.validateLocalUser(user.email, "pass")).rejects.toThrow(
        AccountDisabledError,
      );
    });

    it("throws InvalidCredentialsError when password is wrong", async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
      await expect(service.validateLocalUser(user.email, "wrongpass")).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it("returns user when credentials are valid", async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      const result = await service.validateLocalUser(user.email, "correctpass");
      expect(result).toEqual(user);
    });

    it("normalises email to lowercase before lookup", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateLocalUser("UPPER@school.com", "p")).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "upper@school.com" } }),
      );
    });
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe("login", () => {
    const ipAddress = "127.0.0.1";
    const userAgent = "Jest/1.0";
    const tokens = { accessToken: "access-jwt", refreshToken: "refresh-opaque" };

    beforeEach(() => {
      mockPrisma.school.findFirst.mockResolvedValue({ id: "school-1" });
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ plan: "PREMIUM" });
      mockTokenService.generateTokenPair.mockResolvedValue(tokens);
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it("returns tokens for non-privileged user without 2FA", async () => {
      const user = makeUser({ role: "TEACHER" });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      const result = await service.login(
        { email: user.email, password: "pass" },
        ipAddress,
        userAgent,
      );

      expect(result).toEqual({ accessToken: "access-jwt", refreshToken: "refresh-opaque" });
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", role: "TEACHER" }),
      );
    });

    it("throws TwoFactorRequiredError for ADMIN role with 2FA enabled and no code provided", async () => {
      const user = makeUser({
        role: "ADMIN",
        twoFactor: { isEnabled: true, secret: "TOTP_SECRET" },
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      await expect(
        service.login({ email: user.email, password: "pass" }, ipAddress, userAgent),
      ).rejects.toThrow(TwoFactorRequiredError);
    });

    it("throws InvalidOtpError for SUPER_ADMIN role with wrong TOTP code", async () => {
      const user = makeUser({
        role: "SUPER_ADMIN",
        twoFactor: { isEnabled: true, secret: "TOTP_SECRET" },
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      mockTotpService.verify.mockReturnValue(false);

      await expect(
        service.login(
          { email: user.email, password: "pass", totpCode: "000000" },
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(InvalidOtpError);
    });

    it("returns tokens for ACCOUNTANT role with valid TOTP code", async () => {
      const user = makeUser({
        role: "ACCOUNTANT",
        twoFactor: { isEnabled: true, secret: "TOTP_SECRET" },
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      mockTotpService.verify.mockReturnValue(true);

      const result = await service.login(
        { email: user.email, password: "pass", totpCode: "123456" },
        ipAddress,
        userAgent,
      );

      expect(result).toEqual(tokens);
      expect(mockTotpService.verify).toHaveBeenCalledWith("TOTP_SECRET", "123456");
    });

    it("creates an audit log entry on successful login", async () => {
      const user = makeUser({ role: "TEACHER" });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      await service.login({ email: user.email, password: "pass" }, ipAddress, userAgent);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LOGIN",
            userId: "user-1",
            ipAddress,
          }),
        }),
      );
    });

    it("does not require TOTP for ADMIN when 2FA is not enabled", async () => {
      const user = makeUser({
        role: "ADMIN",
        twoFactor: { isEnabled: false, secret: null },
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      const result = await service.login(
        { email: user.email, password: "pass" },
        ipAddress,
        userAgent,
      );

      expect(result).toEqual(tokens);
      expect(mockTotpService.verify).not.toHaveBeenCalled();
    });
  });

  // ── register ─────────────────────────────────────────────────────────────

  describe("register", () => {
    const dto = {
      tenantId: "tenant-1",
      email: "new@school.com",
      phone: "9876543210",
      password: "SecurePass123!",
      role: "TEACHER",
      firstName: "John",
      lastName: "Doe",
    };

    it("creates user with hashed password and returns id + email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const created = { id: "user-new", email: dto.email.toLowerCase() };
      mockPrisma.user.create.mockResolvedValue(created);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as never);

      const result = await service.register(dto);

      expect(result).toEqual({ id: "user-new", email: dto.email.toLowerCase() });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email.toLowerCase(),
            passwordHash: "hashed-password",
            role: dto.role,
          }),
        }),
      );
    });

    it("throws UnauthorizedException when email is already registered", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ email: dto.email }));
      await expect(service.register(dto)).rejects.toThrow(UnauthorizedException);
    });

    it("hashes password with cost factor 12", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: "u", email: dto.email });
      const hashSpy = jest.spyOn(bcrypt, "hash").mockResolvedValue("h" as never);

      await service.register(dto);

      expect(hashSpy).toHaveBeenCalledWith(dto.password, 12);
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("returns undefined silently when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword("nobody@school.com");
      expect(result).toBeUndefined();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("sets reset token and expiry, returns token when user exists", async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);

      const result = await service.forgotPassword(user.email);

      expect(result).toBeDefined();
      expect(result!.token).toBe("secure-reset-token-abc123");
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            passwordResetToken: "secure-reset-token-abc123",
            passwordResetExpires: expect.any(Date),
          }),
        }),
      );
    });

    it("sets expiry approximately 1 hour in the future", async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);
      const before = Date.now();

      await service.forgotPassword(user.email);

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      const expiry: Date = updateCall.data.passwordResetExpires;
      expect(expiry.getTime()).toBeGreaterThan(before + 55 * 60 * 1000);
      expect(expiry.getTime()).toBeLessThan(before + 65 * 60 * 1000);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("throws UnauthorizedException for invalid or expired token", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword("bad-token", "newpass")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("updates password hash and clears token fields for valid token", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("new-hashed-pass" as never);

      await service.resetPassword("valid-token", "NewPass123!");

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            passwordHash: "new-hashed-pass",
            passwordResetToken: null,
            passwordResetExpires: null,
          }),
        }),
      );
    });

    it("queries for token where expiry is still in the future", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword("tok", "pass")).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            passwordResetToken: "tok",
            passwordResetExpires: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  // ── setupTotp ─────────────────────────────────────────────────────────────

  describe("setupTotp", () => {
    it("creates/upserts twoFactorAuth record and returns secret + otpauthUrl", async () => {
      const user = makeUser();
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockTotpService.generateSecret.mockReturnValue({
        secret: "BASE32SECRET",
        otpauthUrl: "otpauth://totp/SchoolERP:test@school.com",
      });
      mockPrisma.twoFactorAuth.upsert.mockResolvedValue({});

      const result = await service.setupTotp("user-1");

      expect(result.secret).toBe("BASE32SECRET");
      expect(result.otpauthUrl).toContain("otpauth://");
      expect(mockPrisma.twoFactorAuth.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          update: expect.objectContaining({ secret: "BASE32SECRET", isEnabled: false }),
          create: expect.objectContaining({ userId: "user-1", secret: "BASE32SECRET" }),
        }),
      );
    });
  });

  // ── verifyAndEnableTotp ───────────────────────────────────────────────────

  describe("verifyAndEnableTotp", () => {
    it("throws InvalidOtpError when code is invalid", async () => {
      mockPrisma.twoFactorAuth.findUniqueOrThrow.mockResolvedValue({
        userId: "user-1",
        secret: "SECRET",
        isEnabled: false,
      });
      mockTotpService.verify.mockReturnValue(false);

      await expect(service.verifyAndEnableTotp("user-1", "000000")).rejects.toThrow(
        InvalidOtpError,
      );
    });

    it("sets isEnabled=true when code is valid", async () => {
      mockPrisma.twoFactorAuth.findUniqueOrThrow.mockResolvedValue({
        userId: "user-1",
        secret: "SECRET",
        isEnabled: false,
      });
      mockTotpService.verify.mockReturnValue(true);
      mockPrisma.twoFactorAuth.update.mockResolvedValue({});

      await service.verifyAndEnableTotp("user-1", "123456");

      expect(mockPrisma.twoFactorAuth.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { isEnabled: true },
      });
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────────

  describe("refreshTokens", () => {
    it("delegates to tokenService.refreshAccessToken", async () => {
      const tokens = { accessToken: "new-access", refreshToken: "new-refresh" };
      mockTokenService.refreshAccessToken.mockResolvedValue(tokens);

      const result = await service.refreshTokens("raw-refresh-token", "10.0.0.1");

      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(
        "raw-refresh-token",
        "10.0.0.1",
      );
      expect(result).toEqual(tokens);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("calls revokeRefreshToken and creates audit log", async () => {
      const user = makeUser();
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.logout("user-1", "raw-refresh-token");

      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith("raw-refresh-token");
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LOGOUT",
            userId: "user-1",
            entity: "User",
            entityId: "user-1",
          }),
        }),
      );
    });

    it("audit log uses the tenantId from the user record", async () => {
      const user = makeUser({ tenantId: "tenant-42" });
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.logout("user-1", "tok");

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: "tenant-42" }),
        }),
      );
    });
  });
});
