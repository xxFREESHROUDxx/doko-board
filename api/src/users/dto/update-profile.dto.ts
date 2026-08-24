import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Avatars are stored inline as a data URI, so the cap has to keep a row small
 * AND stay under Express's default 100kb JSON body limit — a larger payload
 * would be rejected with 413 before validation ever ran. The client downscales
 * to 128px, which lands around 5-10kb, so this is generous headroom.
 */
export const AVATAR_MAX_LENGTH = 64_000;

const AVATAR_DATA_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export class UpdateProfileDto {
  // Same rules as registration — one identity, one set of constraints.
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores',
  })
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  // null removes the picture. ValidateIf lets it through; @IsOptional alone
  // would too, but being explicit documents that null is a real value here.
  @IsOptional()
  @ValidateIf((dto: UpdateProfileDto) => dto.avatarUrl !== null)
  @IsString()
  @MaxLength(AVATAR_MAX_LENGTH, { message: 'That image is too large' })
  @Matches(AVATAR_DATA_URI, {
    message: 'Avatar must be a base64 PNG, JPEG or WebP data URI',
  })
  avatarUrl?: string | null;
}
