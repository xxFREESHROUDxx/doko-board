import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type PublicUser } from '../auth/auth.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: PublicUser) {
    return this.projectsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
  ) {
    return this.projectsService.findOneForUser(ProjectId, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(ProjectId, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
  ) {
    return this.projectsService.delete(ProjectId, user.id);
  }

  @Get(':id/members')
  findMembers(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectsService.listMembers(projectId, user.id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.addMember(
      ProjectId,
      user.id,
      dto.email,
      dto.role,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.projectsService.removeMember(ProjectId, user.id, targetUserId);
  }

  @Patch(':id/members/:userId')
  changeMemberRole(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) ProjectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.projectsService.changeMemberRole(
      ProjectId,
      user.id,
      targetUserId,
      dto.role,
    );
  }
}
