import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { randomUUID } from "crypto";
import { UserService } from "./user.service";
import { UpdateUserDto } from "../dto/update-user.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { AssignRoleDto } from "../dto/assign-role.dto";
import { ListUsersQueryDto } from "../dto/list-users-query.dto";

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_AVATAR_MAGIC: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0xff, 0xd8, 0xff],             mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47],       mime: "image/png"  },
  { bytes: [0x52, 0x49, 0x46, 0x46],       mime: "image/webp" },
];
function detectMime(buf: Buffer): string | null {
  for (const sig of ALLOWED_AVATAR_MAGIC) {
    if (sig.bytes.every((b, i) => buf[i] === b)) return sig.mime;
  }
  return null;
}

@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }, @Query() query: ListUsersQueryDto) {
    return this.userService.findAll(req.user.tenantId, query);
  }

  @Get("me")
  getMe(@Req() req: Request & { user: RequestUser }) {
    return this.userService.findOne(req.user.id, req.user.tenantId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.userService.findOne(id, req.user.tenantId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, req.user.tenantId, dto);
  }

  @Patch(":id/role")
  assignRole(
    @Param("id") id: string,
    @Req() req: Request & { user: RequestUser },
    @Body() dto: AssignRoleDto,
  ) {
    return this.userService.assignRole(id, req.user.tenantId, dto);
  }

  @Patch(":id/activate")
  @HttpCode(HttpStatus.NO_CONTENT)
  activate(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.userService.setActive(id, req.user.tenantId, true);
  }

  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param("id") id: string, @Req() req: Request & { user: RequestUser }) {
    return this.userService.setActive(id, req.user.tenantId, false);
  }

  @Post("me/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Req() req: Request & { user: RequestUser }, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, req.user.tenantId, dto);
  }

  @Post("me/avatar")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadAvatar(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const detectedMime = detectMime(file.buffer);
    if (!detectedMime || !ALLOWED_AVATAR_MIME.has(detectedMime)) {
      throw new BadRequestException("Only JPEG, PNG, and WebP images are allowed");
    }
    const ext = detectedMime.split("/")[1].replace("jpeg", "jpg");
    const safeFilename = `${randomUUID()}.${ext}`;
    // TODO: upload to S3/R2 using safeFilename, get URL, then update
    const avatarUrl = `/uploads/avatars/${safeFilename}`;
    return this.userService.updateAvatar(req.user.id, req.user.tenantId, avatarUrl);
  }

  @Get("health")
  health() {
    return { status: "ok", service: "user-service" };
  }
}
