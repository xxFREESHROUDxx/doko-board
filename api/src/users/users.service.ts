import { ConflictException, Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const EMAIL_OR_USERNAME_ALREADY_IN_USE = 'Email or Username already in use.';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    username: string;
    password: string;
  }): Promise<User> {
    const normalizedEmail = data.email.toLowerCase();

    const existingEmail = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: data.username }],
      },
    });

    if (existingEmail) {
      throw new ConflictException(EMAIL_OR_USERNAME_ALREADY_IN_USE);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    try {
      return await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          username: data.username,
          passwordHash,
        },
      });
    } catch (error) {
      // P2002 = Prisma unique constraint violation. Thrown by the DB when our
      // application check (above) missed a race condition and two concurrent
      // requests both passed the check. The DB constraint is our safety net.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(EMAIL_OR_USERNAME_ALREADY_IN_USE);
      }

      throw error;
    }
  }

  /**
   * Updates the signed-in user's own profile. Only the three fields on the DTO
   * can be touched — passwordHash is not reachable from here, and a password
   * change would need the current one, which is a separate flow.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    // Undefined means "not sent" and Prisma skips it. null on avatarUrl is a
    // real value: it removes the picture.
    const data: Prisma.UserUpdateInput = {};

    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    try {
      return await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      // Two people can pass a pre-check and still collide; the unique index is
      // the real guard. Naming the field beats a generic "already in use".
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const field = Array.isArray(target) ? String(target[0]) : String(target ?? '');

        throw new ConflictException(
          field.includes('username')
            ? 'That username is already taken.'
            : field.includes('email')
              ? 'That email is already in use.'
              : EMAIL_OR_USERNAME_ALREADY_IN_USE,
        );
      }

      throw error;
    }
  }
}
