export interface JwtPayload {
  sub: string;
  email: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}
