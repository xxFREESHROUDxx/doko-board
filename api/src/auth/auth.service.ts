import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

interface JwtPayload {
  sub: string;
  email: string;
}

interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

const INVALID_CREDENTIALS = 'Invalid Credentials';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(data: {
    email: string;
    username: string;
    password: string;
  }): Promise<AuthResult> {
    const user = await this.usersService.create(data);

    return this.buildAuthResult(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);

    // Note: Same error for "user not found" and "wrong password".
    // Don't tell the attacker which one failed - it leaks whether an email is registered.
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.buildAuthResult(user);
  }

  private buildAuthResult(user: {
    id: string;
    email: string;
    username: string;
  }): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
