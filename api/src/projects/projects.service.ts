import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project, ProjectRole } from '@prisma/client';
import { UpdateProjectDto } from './dto/update-project.dto';

const PROJECT_NOT_FOUND = 'Project not found!';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        members: {
          create: {
            userId,
            role: ProjectRole.OWNER,
          },
        },
      },
    });
  }

  async findAllForUser(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneForUser(projectId: string, userId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: { userId },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    return project;
  }

  async update(
    projectId: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    await this.assertCanModify(projectId, userId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });
  }

  async delete(projectId: string, userId: string): Promise<void> {
    await this.assertOwner(projectId, userId);

    await this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  private async assertCanModify(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    if (
      membership.role !== ProjectRole.OWNER &&
      membership.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this project!',
      );
    }
  }

  private async assertOwner(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    if (membership.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete this project.');
    }
  }
}
