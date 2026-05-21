import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1, { message: 'Project name is required' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description!: string;
}
