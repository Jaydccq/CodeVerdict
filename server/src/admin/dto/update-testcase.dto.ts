import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class UpdateTestCaseStandaloneDto {
  @IsString()
  @IsOptional()
  input?: string;

  @IsString()
  @IsOptional()
  expectedOutput?: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
