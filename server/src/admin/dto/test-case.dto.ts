import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTestCaseDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  expectedOutput: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class UpdateTestCaseDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  expectedOutput: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @Min(0)
  displayOrder: number;
}
