import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './auth-response.dto';

export class RegisterResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
