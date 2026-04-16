import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { RequestUser } from "@school-erp/types";
import { UserService } from "./user.service";
import { UpdateUserDto } from "../dto/update-user.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { AssignRoleDto } from "../dto/assign-role.dto";
import { ListUsersQueryDto } from "../dto/list-users-query.dto";

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
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: upload to S3/R2, get URL, then update
    const avatarUrl = `/uploads/avatars/${req.user.id}-${file.originalname}`;
    return this.userService.updateAvatar(req.user.id, req.user.tenantId, avatarUrl);
  }

  @Get("health")
  health() {
    return { status: "ok", service: "user-service" };
  }
}
