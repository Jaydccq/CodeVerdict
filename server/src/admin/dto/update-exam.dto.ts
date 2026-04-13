import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateExamDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  allowedLanguages?: number[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
