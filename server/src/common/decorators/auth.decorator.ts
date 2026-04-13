import { applyDecorators, UseGuards, Type } from '@nestjs/common';
import { AuthType } from '../enums/auth-type.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export function Auth(
  authType: AuthType = AuthType.JWT,
  extraGuards: Type[] = [],
) {
  if (authType === AuthType.NONE) {
    return applyDecorators();
  }

  const guards: Type[] = [];

  if (authType === AuthType.JWT) {
    guards.push(JwtAuthGuard);
  }

  guards.push(...extraGuards);

  return applyDecorators(UseGuards(...guards));
}
