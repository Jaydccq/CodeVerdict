import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class McqSubmitDto {
  @ApiProperty({
    description:
      'Array of selected option IDs (server-assigned 0-based indices)',
    type: [Number],
    example: [2],
  })
  @IsArray()
  @IsInt({ each: true })
  selectedOptionIds: number[];
}
