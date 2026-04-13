import { ApiProperty } from '@nestjs/swagger';

export class LanguageResponseDto {
  @ApiProperty({ example: 71 })
  id!: number;

  @ApiProperty({ example: 'Python' })
  name!: string;

  @ApiProperty({ example: '3.8.1' })
  version!: string;
}
