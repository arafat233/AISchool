import * as bcrypt from "bcrypt";
import { UserService } from "./user.service";
import { NotFoundError, ConflictError } from "@school-erp/errors";

// ── Module mocks ──────────────────────────────────────────────────────────

jest.mock("@school-erp/utils", () => ({
  parsePagination: jest.fn().mockReturnValue({ skip: 0, take: 10, page: 1, limit: 10 }),
  buildPaginatedResult: jest.fn().mockImplementation((data, total, page, limit) => ({
    data,
    total,
    page,
    limit,
  })),
  generateAdmissionNumber: jest.fn().mockReturnValue("ADM-001"),
}));

// ── Prisma mock ───────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userProfile: {
    update: jest.fn(),
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  email: "teacher@school.com",
  phone: "9876543210",
  role: "TEACHER",
  tenantId: "tenant-1",
  isActive: true,
  passwordHash: "$2b$12$hash",
  passwordResetToken: null,
  passwordResetExpires: null,
  profile: { firstName: "John", lastName: "Doe", avatarUrl: null },
  twoFactor: { isEnabled: false },
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("UserService", () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(mockPrisma as any);
  });

  // ── findAll (listUsers) ───────────────────────────────────────────────────

  describe("findAll", () => {
    it("calls findMany and count with tenantId filter", async () => {
      const users = [makeUser()];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll("tenant-1", { page: 1, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-1" }) }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-1" }) }),
      );
      expect(result.total).toBe(1);
    });

    it("applies role filter when provided", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll("tenant-1", { page: 1, limit: 10, role: "TEACHER" });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "TEACHER" }),
        }),
      );
    });

    it("does not apply role filter when role is not provided", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll("tenant-1", { page: 1, limit: 10 });

      const whereArg = mockPrisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.role).toBeUndefined();
    });

    it("applies search filter with OR clause when search is provided", async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll("tenant-1", { page: 1, limit: 10, search: "john" });

      const whereArg = mockPrisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeDefined();
      expect(whereArg.OR.length).toBeGreaterThan(0);
    });

    it("strips sensitive fields from returned users via sanitize", async () => {
      const user = makeUser({ passwordHash: "should-be-removed", passwordResetToken: "also-removed" });
      mockPrisma.user.findMany.mockResolvedValue([user]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll("tenant-1", { page: 1, limit: 10 });

      const returnedUser = result.data[0];
      expect(returnedUser.passwordHash).toBeUndefined();
      expect(returnedUser.passwordResetToken).toBeUndefined();
    });

    it("passes skip and take from parsePagination to findMany", async () => {
      const { parsePagination } = require("@school-erp/utils");
      parsePagination.mockReturnValue({ skip: 20, take: 10, page: 3, limit: 10 });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll("tenant-1", { page: 3, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── findOne (getUserById) ─────────────────────────────────────────────────

  describe("findOne", () => {
    it("returns sanitized user when found", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne("user-1", "tenant-1");

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("teacher@school.com");
      expect(result.passwordHash).toBeUndefined();
    });

    it("throws NotFoundError when user does not exist", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne("unknown-id", "tenant-1")).rejects.toThrow(NotFoundError);
    });

    it("queries by both id and tenantId to enforce tenant isolation", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "tenant-99")).rejects.toThrow(NotFoundError);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1", tenantId: "tenant-99" },
        }),
      );
    });
  });

  // ── update (updateUser) ───────────────────────────────────────────────────

  describe("update", () => {
    it("updates and returns sanitized user", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      const updated = makeUser({ phone: "1111111111" });
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update("user-1", "tenant-1", { phone: "1111111111" });

      expect(result.phone).toBe("1111111111");
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user-1" } }),
      );
    });

    it("throws NotFoundError when user does not exist", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.update("bad-id", "tenant-1", { phone: "000" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("includes profile nested update when firstName is provided", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(makeUser({ profile: { firstName: "Jane", lastName: "Doe", avatarUrl: null } }));

      await service.update("user-1", "tenant-1", { firstName: "Jane" });

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.profile).toBeDefined();
      expect(updateCall.data.profile.update.firstName).toBe("Jane");
    });
  });

  // ── assignRole ────────────────────────────────────────────────────────────

  describe("assignRole", () => {
    it("updates the user role field and returns sanitized user", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(makeUser({ role: "ADMIN" }));

      const result = await service.assignRole("user-1", "tenant-1", { role: "ADMIN" });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: { role: "ADMIN" },
        }),
      );
      expect(result.role).toBe("ADMIN");
    });

    it("throws NotFoundError when user does not exist", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.assignRole("ghost-id", "tenant-1", { role: "ADMIN" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── setActive (softDeleteUser) ────────────────────────────────────────────

  describe("setActive", () => {
    it("sets isActive=false to soft-delete user", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(makeUser({ isActive: false }));

      await service.setActive("user-1", "tenant-1", false);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { isActive: false },
      });
    });

    it("sets isActive=true to re-enable user", async () => {
      const user = makeUser({ isActive: false });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(makeUser({ isActive: true }));

      await service.setActive("user-1", "tenant-1", true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { isActive: true },
      });
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe("changePassword", () => {
    it("throws NotFoundError when user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.changePassword("ghost", "tenant-1", {
          currentPassword: "old",
          newPassword: "new",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when current password is incorrect", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(
        service.changePassword("user-1", "tenant-1", {
          currentPassword: "wrongpass",
          newPassword: "newpass",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("updates password hash when current password is correct", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("new-hash" as never);
      mockPrisma.user.update.mockResolvedValue({});

      await service.changePassword("user-1", "tenant-1", {
        currentPassword: "correct",
        newPassword: "NewPass123!",
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "new-hash" },
      });
    });
  });
});
