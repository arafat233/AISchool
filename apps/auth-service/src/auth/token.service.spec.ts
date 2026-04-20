import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { TokenService } from "./token.service";

// ── Module mocks ──────────────────────────────────────────────────────────

let mockGenerateSecureToken: jest.Mock;
let mockSha256: jest.Mock;

jest.mock("@school-erp/utils", () => {
  mockGenerateSecureToken = jest.fn().mockReturnValue("raw-refresh-token-hex");
  mockSha256 = jest.fn().mockReturnValue("sha256-hash-of-token");
  return {
    generateSecureToken: mockGenerateSecureToken,
    sha256: mockSha256,
  };
});

// ── Prisma mock ───────────────────────────────────────────────────────────

const mockPrisma = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  tenant: {
    findUniqueOrThrow: jest.fn(),
  },
  school: {
    findFirst: jest.fn(),
  },
};

const mockJwtService: Partial<JwtService> = {
  sign: jest.fn().mockReturnValue("signed-jwt-token"),
  verify: jest.fn(),
};

// ── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  email: "test@school.com",
  role: "TEACHER",
  tenantId: "tenant-1",
  twoFactor: null,
  ...overrides,
});

const makeStoredToken = (overrides: Partial<any> = {}) => ({
  id: "rt-1",
  userId: "user-1",
  tokenHash: "sha256-hash-of-token",
  isRevoked: false,
  expiresAt: new Date(Date.now() + 7 * 86400 * 1000),
  user: makeUser(),
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TokenService", () => {
  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

    // Re-apply defaults after clearAllMocks
    (mockJwtService.sign as jest.Mock).mockReturnValue("signed-jwt-token");
    mockGenerateSecureToken.mockReturnValue("raw-refresh-token-hex");
    mockSha256.mockReturnValue("sha256-hash-of-token");

    service = new TokenService(mockJwtService as JwtService, mockPrisma as any);
  });

  // ── generateTokenPair ─────────────────────────────────────────────────────

  describe("generateTokenPair", () => {
    const input = {
      userId: "user-1",
      email: "test@school.com",
      role: "TEACHER",
      tenantId: "tenant-1",
      schoolId: "school-1",
      plan: "PREMIUM",
      ipAddress: "127.0.0.1",
      userAgent: "Jest/1.0",
    };

    it("signs a JWT with correct payload and secret", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.generateTokenPair(input);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "user-1",
          email: "test@school.com",
          role: "TEACHER",
          tenantId: "tenant-1",
          schoolId: "school-1",
          plan: "PREMIUM",
        }),
        expect.objectContaining({ secret: "test-access-secret" }),
      );
    });

    it("generates a random opaque refresh token and stores its hash", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.generateTokenPair(input);

      expect(mockGenerateSecureToken).toHaveBeenCalledWith(40);
      expect(mockSha256).toHaveBeenCalledWith("raw-refresh-token-hex");
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            tokenHash: "sha256-hash-of-token",
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it("returns both accessToken and refreshToken", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.generateTokenPair(input);

      expect(result.accessToken).toBe("signed-jwt-token");
      expect(result.refreshToken).toBe("raw-refresh-token-hex");
    });

    it("stores ipAddress and userAgent in the refresh token record", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.generateTokenPair(input);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: "127.0.0.1",
            userAgent: "Jest/1.0",
          }),
        }),
      );
    });

    it("sets refresh token expiry to approximately 7 days from now", async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const before = Date.now();

      await service.generateTokenPair(input);

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      const expiry: Date = createCall.data.expiresAt;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiry.getTime()).toBeGreaterThan(before + sevenDaysMs - 5000);
      expect(expiry.getTime()).toBeLessThan(before + sevenDaysMs + 5000);
    });
  });

  // ── refreshAccessToken ────────────────────────────────────────────────────

  describe("refreshAccessToken", () => {
    it("throws UnauthorizedException when refresh token is not found", async () => {
      mockSha256.mockReturnValue("unknown-hash");
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshAccessToken("bad-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when refresh token is revoked", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(
        makeStoredToken({ isRevoked: true }),
      );

      await expect(service.refreshAccessToken("raw-refresh-token-hex")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when refresh token is expired", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(
        makeStoredToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refreshAccessToken("raw-refresh-token-hex")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("revokes the old token and issues a new pair for a valid token", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(makeStoredToken());
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ plan: "PREMIUM" });
      mockPrisma.school.findFirst.mockResolvedValue({ id: "school-1" });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshAccessToken("raw-refresh-token-hex");

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "rt-1" },
        data: { isRevoked: true },
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("carries forward ipAddress to the new token pair", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(makeStoredToken());
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.tenant.findUniqueOrThrow.mockResolvedValue({ plan: "BASIC" });
      mockPrisma.school.findFirst.mockResolvedValue({ id: "school-1" });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.refreshAccessToken("raw-refresh-token-hex", "192.168.1.1");

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipAddress: "192.168.1.1" }),
        }),
      );
    });
  });

  // ── revokeRefreshToken ────────────────────────────────────────────────────

  describe("revokeRefreshToken", () => {
    it("calls updateMany with the token hash", async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeRefreshToken("raw-token");

      expect(mockSha256).toHaveBeenCalledWith("raw-token");
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: "sha256-hash-of-token" },
        data: { isRevoked: true },
      });
    });
  });

  // ── revokeAllUserTokens ───────────────────────────────────────────────────

  describe("revokeAllUserTokens", () => {
    it("calls updateMany where userId and isRevoked=false", async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.revokeAllUserTokens("user-1");

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  // ── verifyAccessToken ─────────────────────────────────────────────────────

  describe("verifyAccessToken", () => {
    it("returns the decoded payload for a valid token", () => {
      const payload = {
        sub: "user-1",
        email: "test@school.com",
        role: "TEACHER",
        tenantId: "tenant-1",
      };
      (mockJwtService.verify as jest.Mock).mockReturnValue(payload);

      const result = service.verifyAccessToken("valid.jwt.token");

      expect(result).toEqual(payload);
      expect(mockJwtService.verify).toHaveBeenCalledWith("valid.jwt.token", {
        secret: "test-access-secret",
      });
    });

    it("throws when JwtService.verify throws (invalid token)", () => {
      (mockJwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid signature");
      });

      expect(() => service.verifyAccessToken("bad.jwt")).toThrow("invalid signature");
    });

    it("throws when JWT_ACCESS_SECRET env var is not set", () => {
      delete process.env.JWT_ACCESS_SECRET;
      expect(() => service.verifyAccessToken("any.token")).toThrow(
        "JWT_ACCESS_SECRET is not set",
      );
    });
  });
});
