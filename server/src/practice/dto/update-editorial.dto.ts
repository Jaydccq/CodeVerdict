import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateEditorialDto {
  @ApiProperty()
  @IsString()
  @MinLength(0)
  editorial: string;
}
