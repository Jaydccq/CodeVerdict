import {
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class McqAnswerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  problemId: number;

  @ApiProperty({
    type: [String],
    example: ['3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  selectedOptionIds: string[];
}

export class McqSectionSubmitDto {
  @ApiProperty({ type: [McqAnswerDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => McqAnswerDto)
  answers: McqAnswerDto[];
}
