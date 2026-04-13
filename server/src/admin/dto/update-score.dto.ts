import { IsNumber, IsInt, IsOptional, IsDateString } from 'class-validator';

export class UpdateScoreDto {
  @IsNumber()
  @IsOptional()
  bestScore?: number;

  @IsInt()
  @IsOptional()
  wrongAttempts?: number;

  @IsInt()
  @IsOptional()
  totalAttempts?: number;

  @IsDateString()
  @IsOptional()
  firstSolvedAt?: string;
}
