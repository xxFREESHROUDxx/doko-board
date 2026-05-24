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
import { TasksService } from './tasks.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { PublicUser } from '../auth/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private taskService: TasksService) {}

  @Get(':id/tasks')
  findAll(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
  ) {
    return this.taskService.findAllForProject(projectId, user.id);
  }

  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.taskService.create(projectId, user.id, dto);
  }

  @Get(':id/tasks/:taskId')
  findOne(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.taskService.findOneForProject(projectId, user.id, taskId);
  }

  @Patch(':id/tasks/:taskId')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(projectId, user.id, taskId, dto);
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.taskService.delete(projectId, user.id, taskId);
  }
}
