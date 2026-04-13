import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const user = await this.usersService.create(dto);

    return {
      user: {
        id: user.id,
        email: user.email,
        rollNumber: user.rollNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        metadata: user.metadata,
      },
    };
  }

  async refresh(expiredToken: string): Promise<{ accessToken: string }> {
    let payload: { sub?: unknown };
    try {
      payload = this.jwtService.verify(expiredToken, {
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { accessToken: this.jwtService.sign({ sub: user.id }) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        rollNumber: user.rollNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        metadata: user.metadata,
      },
    };
  }
}
