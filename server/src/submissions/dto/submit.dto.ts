import { IsInt, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MAX_SOURCE_CODE_BYTES = 65_536;

export class SubmitDto {
  @ApiProperty({
    example: 'print("hello")',
    description: 'Source code (max 64 KB)',
    maxLength: MAX_SOURCE_CODE_BYTES,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SOURCE_CODE_BYTES)
  sourceCode: string;

  @ApiProperty({
    example: 71,
    description:
      'Judge0 language ID - get available IDs from GET /api/languages',
  })
  @IsInt()
  languageId: number;
}
