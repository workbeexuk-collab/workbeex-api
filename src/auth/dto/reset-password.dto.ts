import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters' })
  @MaxLength(100)
  password: string;
}
