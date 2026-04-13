import { Controller, Post, Get, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { AuthType } from '../common/enums/auth-type.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Auth(AuthType.NONE)
  @ApiOperation({
    summary: 'Register a new student account',
    description:
      'Creates a new user with STUDENT role. No token is returned - call POST /auth/login to authenticate.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - missing or invalid fields',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or roll number already exists',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @Auth(AuthType.NONE)
  @ApiOperation({
    summary: 'Refresh an expired access token',
    description:
      'Exchange an expired (but signature-valid) JWT for a new one. The token signature must be valid; only expiry is ignored.',
  })
  @ApiResponse({
    status: 201,
    description: 'New access token issued',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token signature is invalid or user not found',
  })
  async refresh(
    @Body('token') token: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(token);
  }

  @Post('login')
  @Auth(AuthType.NONE)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates the user and returns a JWT token. Use the accessToken in the Authorization header as "Bearer <token>" for protected endpoints.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Returns the authenticated user's profile. Requires a valid JWT token.",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  getMe(@GetUser() user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      rollNumber: user.rollNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      metadata: user.metadata,
    };
  }
}
