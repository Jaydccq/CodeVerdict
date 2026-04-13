import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { SECRETS } from '../config/env';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: SECRETS.JWT_SECRET,
      signOptions: {
        expiresIn: SECRETS.JWT_EXPIRES_IN as StringValue,
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
