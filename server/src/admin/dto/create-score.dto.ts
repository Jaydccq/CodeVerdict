import { IsInt, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateScoreDto {
  @IsInt()
  userId: number;

  @IsInt()
  problemId: number;

  @IsInt()
  examId: number;

  @IsNumber()
  @IsOptional()
  bestScore?: number;

  @IsInt()
  @IsOptional()
  totalAttempts?: number;

  @IsInt()
  @IsOptional()
  wrongAttempts?: number;

  @IsDateString()
  @IsOptional()
  firstSolvedAt?: string;
}
