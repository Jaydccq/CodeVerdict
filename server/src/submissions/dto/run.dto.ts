import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_SOURCE_CODE_BYTES = 65_536;
const MAX_CUSTOM_INPUT_BYTES = 4_096;

export class RunDto {
  @ApiProperty({
    example: 'print(input())',
    description: 'Source code (max 64 KB)',
    maxLength: MAX_SOURCE_CODE_BYTES,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SOURCE_CODE_BYTES)
  sourceCode: string;

  @ApiProperty({ example: 71, description: 'Judge0 language ID' })
  @IsInt()
  languageId: number;

  @ApiPropertyOptional({
    example: '5\n1 2 3 4 5',
    description:
      'Custom test input (max 4 KB). If provided, code is also run against this input and the result is returned as customResult.',
    maxLength: MAX_CUSTOM_INPUT_BYTES,
  })
  @IsString()
  @IsOptional()
  @MaxLength(MAX_CUSTOM_INPUT_BYTES)
  customInput?: string;
}
