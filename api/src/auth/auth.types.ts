export interface JwtPayload {
  sub: string;
  email: string;
}

import type { User } from '@prisma/client';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

/**
 * The only place a User row becomes a PublicUser. Everything the API hands out
 * goes through here, so passwordHash cannot leak by omission and a new public
 * field is added once rather than in three places.
 */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}
