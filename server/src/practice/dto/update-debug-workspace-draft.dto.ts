import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateDebugWorkspaceDraftDto {
  @ApiProperty({
    additionalProperties: { type: 'string' },
    type: 'object',
  })
  @IsObject()
  editedFiles: Record<string, string>;
}
