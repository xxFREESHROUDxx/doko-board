import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma, Project, ProjectRole } from '@prisma/client';
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
    await this.assertCanAdminister(projectId, userId);

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

  private async assertCanAdminister(
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

  async listMembers(projectId: string, userId: string) {
    // Anyone who's a member of a project can list its members.
    const requester = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!requester) {
      throw new NotFoundException(PROJECT_NOT_FOUND);
    }

    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' }, // so that the OWNER comes first as they are the one who joined at first
    });
  }

  async addMember(
    projectId: string,
    actingUserId: string,
    memberEmail: string,
    role: ProjectRole,
  ): Promise<void> {
    // Check if the requester is a OWNER or ADMIN
    await this.assertCanAdminister(projectId, actingUserId);

    // We don't promote someone to OWNER through this endpoint - ownership transfer is a separate flow
    if (role === ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Use the ownership transfer endpoint to assign OWNER',
      );
    }

    // Find the user by email. Returning 404 here doesn't disclose project info
    // It discloses that this email isn't on the platform. We'll address this later.
    const targetUser = await this.prisma.user.findUnique({
      where: { email: memberEmail.toLowerCase() },
    });

    if (!targetUser) {
      return; // silently returning nothing if there is no user found. So that attacker cannot know if the user exists or not.
    }

    // Check existence first; rely on unique constraints as safety
    const existing = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUser.id },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project.');
    }

    try {
      await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: targetUser.id,
          role,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already a member of this project.',
        );
      }

      throw error;
    }
  }

  async removeMember(
    projectId: string,
    actingUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertCanAdminister(projectId, actingUserId);

    const targetUser = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    if (!targetUser) {
      throw new NotFoundException('Member not found in this project');
    }

    // Cannot remove the OWNER through this endpoint.
    if (targetUser.role === ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Cannot remove this project owner. Transfer ownership first.',
      );
    }

    // Admins cannot remove other admins
    const actingUser = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actingUserId } },
    });

    if (
      actingUser!.role === ProjectRole.ADMIN &&
      targetUser.role === ProjectRole.ADMIN
    ) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  }

  async changeMemberRole(
    projectId: string,
    actingUserId: string,
    targetUserId: string,
    newRole: ProjectRole,
  ): Promise<void> {
    await this.assertCanAdminister(projectId, actingUserId);

    if (newRole === ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Use the ownership transfer endpoint to assign OWNER',
      );
    }

    const targetUser = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    if (!targetUser) {
      throw new NotFoundException('Member not found in this project');
    }

    if (targetUser.role === ProjectRole.OWNER) {
      throw new ForbiddenException("Cannot change the owner's role");
    }

    await this.prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
      data: { role: newRole },
    });
  }
}
