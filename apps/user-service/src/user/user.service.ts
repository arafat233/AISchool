import { Injectable } from "@nestjs/common";
import { PrismaService } from "@school-erp/database";
import { NotFoundError, ConflictError } from "@school-erp/errors";
import { parsePagination, buildPaginatedResult } from "@school-erp/utils";
import type { PaginationQuery } from "@school-erp/types";
import * as bcrypt from "bcrypt";
import { UpdateUserDto } from "../dto/update-user.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { AssignRoleDto } from "../dto/assign-role.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationQuery & { role?: string }) {
    const { skip, take, page, limit } = parsePagination(query);
    const where = {
      tenantId,
      ...(query.role ? { role: query.role as any } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" as const } },
              { profile: { firstName: { contains: query.search, mode: "insensitive" as const } } },
              { profile: { lastName: { contains: query.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: { profile: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(data.map(this.sanitize), total, page, limit);
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { profile: true, twoFactor: { select: { isEnabled: true } } },
    });
    if (!user) throw new NotFoundError("User", id);
    return this.sanitize(user);
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        phone: dto.phone,
        profile: dto.firstName || dto.lastName || dto.avatarUrl
          ? {
              update: {
                ...(dto.firstName && { firstName: dto.firstName }),
                ...(dto.lastName && { lastName: dto.lastName }),
                ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
                ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
                ...(dto.gender && { gender: dto.gender as any }),
                ...(dto.address && { address: dto.address }),
              },
            }
          : undefined,
      },
      include: { profile: true },
    });
    return this.sanitize(updated);
  }

  async assignRole(id: string, tenantId: string, dto: AssignRoleDto) {
    await this.findOne(id, tenantId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role as any },
    });
    return this.sanitize(updated);
  }

  async setActive(id: string, tenantId: string, isActive: boolean) {
    await this.findOne(id, tenantId);
    await this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async changePassword(id: string, tenantId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundError("User", id);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash ?? "");
    if (!valid) throw new ConflictError("Current password is incorrect");

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } });
  }

  async updateAvatar(id: string, tenantId: string, avatarUrl: string) {
    await this.findOne(id, tenantId);
    await this.prisma.userProfile.update({ where: { userId: id }, data: { avatarUrl } });
  }

  private sanitize(user: any) {
    const { passwordHash, passwordResetToken, passwordResetExpires, ...safe } = user;
    return safe;
  }
}
