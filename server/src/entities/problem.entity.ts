import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TestCase } from './test-case.entity';
import type { McqOption } from '../types/mcq-option.interface';

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('problems')
export class Problem extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  inputFormat?: string;

  @Column({ type: 'text', nullable: true })
  outputFormat?: string;

  @Column({ type: 'text', nullable: true })
  constraints?: string;

  @Column({ type: 'text', nullable: true })
  sampleInput?: string;

  @Column({ type: 'text', nullable: true })
  sampleOutput?: string;

  @Column({ type: 'enum', enum: Difficulty, default: Difficulty.MEDIUM })
  difficulty: Difficulty;

  @Column({ type: 'int', default: 2000 })
  timeLimitMs: number;

  @Column({ type: 'int', default: 262144 })
  memoryLimitKb: number;

  @Column({ type: 'int', default: 10 })
  maxScore: number;

  @Column({ type: 'jsonb', nullable: true })
  starterCode: Record<string, string> | null;

  @Column({ type: 'text', nullable: true })
  referenceSolutionCode: string | null;

  @Column({ type: 'int', nullable: true })
  referenceSolutionLanguageId: number | null;

  @Column({ type: 'varchar', length: 10, default: 'coding' })
  questionType: 'coding' | 'mcq';

  @Column({ default: false })
  isMultiSelect: boolean;

  @Column({ type: 'text', nullable: true })
  questionImageData: string | null;

  @Column({ type: 'jsonb', nullable: true })
  mcqOptions: McqOption[] | null;

  @OneToMany(() => TestCase, (tc) => tc.problem)
  testCases: TestCase[];
}
