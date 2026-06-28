import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { RunSampleDto } from './run-sample.dto';

export class RunCustomDto extends RunSampleDto {
  @ApiProperty()
  @IsString()
  @MinLength(0)
  customInput: string;
}
