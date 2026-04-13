import {
  IsEmail,
  IsString,
  IsBoolean,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'CS2024001',
    maxLength: 20,
    description: 'University roll number',
  })
  @IsString()
  @MaxLength(20)
  rollNumber: string;

  @ApiProperty({ example: 'John', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+91', maxLength: 5 })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  countryCode?: string;

  @ApiPropertyOptional({ example: '9876543210', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      "Set to true to indicate you'd like to be considered for QA Engineering if you're not selected for the developer role - this is a proactive choice made before the exam",
  })
  @IsBoolean()
  @IsOptional()
  qaRoleOptIn?: boolean;
}
