import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsBoolean,
  IsIn,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty } from '../../entities/problem.entity';
import { UpdateTestCaseDto } from './test-case.dto';
import { CreateMcqOptionDto } from './create-mcq-option.dto';

export class UpdateProblemDto {
  @IsIn(['coding', 'mcq'])
  @IsOptional()
  questionType?: 'coding' | 'mcq';
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  inputFormat?: string;

  @IsString()
  @IsOptional()
  outputFormat?: string;

  @IsString()
  @IsOptional()
  constraints?: string;

  @IsString()
  @IsOptional()
  sampleInput?: string;

  @IsString()
  @IsOptional()
  sampleOutput?: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsInt()
  @Min(100)
  @IsOptional()
  timeLimitMs?: number;

  @IsInt()
  @Min(1024)
  @IsOptional()
  memoryLimitKb?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @IsObject()
  @IsOptional()
  starterCode?: Record<string, string>;

  @IsString()
  @IsOptional()
  referenceSolutionCode?: string;

  @IsInt()
  @IsOptional()
  referenceSolutionLanguageId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTestCaseDto)
  @IsOptional()
  testCases?: UpdateTestCaseDto[];

  @IsBoolean()
  @IsOptional()
  isMultiSelect?: boolean;

  @IsString()
  @IsOptional()
  questionImageData?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMcqOptionDto)
  @IsOptional()
  mcqOptions?: CreateMcqOptionDto[];
}
