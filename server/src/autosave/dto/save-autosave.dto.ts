import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CodeState } from '../../entities/auto-save.entity';

export class SaveAutosaveDto {
  @ApiProperty({
    example: { '1': { '71': 'print("hello")' } },
    description: 'Nested map: problemId → languageId → source code string',
  })
  @IsObject()
  codeState: CodeState;
}
