import { ProjectRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(ProjectRole, {
    message: 'Role must be one of: ADMIN, MEMBER, VIEWER',
  })
  role!: ProjectRole;
}
