import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole, Task } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async assertIsMember(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new NotFoundException('Project not found');
    }
  }

  private async assertAssigneeIsMember(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new BadRequestException(
        'Assignee must be a member of this project',
      );
    }
  }

  private async assertTaskInProject(
    taskId: string,
    projectId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true }, // we only need to know it exists; don't fetch the whole row
    });

    if (!task) {
      throw new NotFoundException('Task not found in this project');
    }
  }

  async findAllForProject(projectId: string, userId: string): Promise<Task[]> {
    await this.assertIsMember(projectId, userId);

    return await this.prisma.task.findMany({
      where: { projectId },
      orderBy: [
        { priority: 'desc' },
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    await this.assertIsMember(projectId, userId);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(projectId, dto.assigneeId);
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        createdById: userId,
        projectId,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate,
      },
    });
  }

  async findOneForProject(
    projectId: string,
    userId: string,
    taskId: string,
  ): Promise<Task> {
    await this.assertIsMember(projectId, userId);

    const existingTask = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found for the project');
    }

    return existingTask;
  }

  async update(
    projectId: string,
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    await this.assertIsMember(projectId, userId);
    await this.assertTaskInProject(taskId, projectId);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(projectId, dto.assigneeId);
    }

    return this.prisma.task.update({
      where: { id: taskId, projectId },
      data: {
        // we could directly do data: dto it also works as values other than specified in dto are stripped with whitelist: true in global pipe.
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate,
        assigneeId: dto.assigneeId,
      },
    });
  }

  async delete(
    projectId: string,
    userId: string,
    taskId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new NotFoundException('Project not found');
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      select: { id: true, createdById: true }, // we only need to know if task is there and is the user the task creator
    });

    if (!task) {
      throw new NotFoundException('Task not found in this project');
    }

    const isAdminOrOwner =
      membership.role === ProjectRole.ADMIN ||
      membership.role === ProjectRole.OWNER;

    const isTaskCreator = task.createdById === userId;

    if (!isAdminOrOwner && !isTaskCreator) {
      throw new ForbiddenException('You cannot delete this task');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}
