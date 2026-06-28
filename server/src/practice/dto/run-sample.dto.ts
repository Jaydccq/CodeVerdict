import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { PRACTICE_LANGUAGE_KEYS } from '../languages';

export class RunSampleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  sourceCode: string;

  @ApiProperty({ enum: PRACTICE_LANGUAGE_KEYS })
  @IsString()
  @IsIn(PRACTICE_LANGUAGE_KEYS)
  language: string;
}
