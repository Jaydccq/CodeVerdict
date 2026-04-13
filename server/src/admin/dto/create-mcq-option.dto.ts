import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMcqOptionDto {
  // 'id' is optional: present when updating an existing option (UUID preserved),
  // absent when creating a new option (UUID generated server-side).
  // No 'displayOrder' - options are shuffled per response; admin order = insertion order

  @ApiPropertyOptional({
    description: 'Existing option UUID - omit for new options',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Option text', example: 'O(n log n)' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'Base64-encoded image for this option',
  })
  @IsString()
  @IsOptional()
  imageData?: string;

  @ApiProperty({ description: 'Whether this option is correct' })
  @IsBoolean()
  isCorrect: boolean;
}
