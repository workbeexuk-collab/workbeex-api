import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { UserType } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, {
    message: 'Please provide a valid UK postcode',
  })
  postcode?: string;

  @IsOptional()
  @IsEnum(UserType)
  type?: UserType = UserType.CUSTOMER;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  preferredLanguage?: string = 'en';

  // Phone verification - if true, phone must be verified before registration completes
  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean = false;
}

// DTO for social login/registration
export class SocialAuthDto {
  @IsString()
  @IsEnum(['GOOGLE', 'APPLE', 'LINKEDIN'])
  provider: 'GOOGLE' | 'APPLE' | 'LINKEDIN';

  @IsString()
  idToken: string; // OAuth ID token

  @IsOptional()
  @IsEnum(UserType)
  type?: UserType = UserType.CUSTOMER;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, {
    message: 'Please provide a valid UK postcode',
  })
  postcode?: string;
}

// DTO for completing registration (after phone verification)
export class CompleteRegistrationDto {
  @IsString()
  userId: string;

  @IsString()
  @Matches(/^\+44[1-9]\d{9,10}$/, {
    message: 'Please provide a valid UK phone number',
  })
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  verificationCode: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, {
    message: 'Please provide a valid UK postcode',
  })
  postcode?: string;
}
