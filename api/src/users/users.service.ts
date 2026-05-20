import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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
}
