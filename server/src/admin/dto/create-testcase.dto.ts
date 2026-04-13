import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateTestCaseStandaloneDto {
  @IsInt()
  problemId: number;

  @IsString()
  input: string;

  @IsString()
  expectedOutput: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
