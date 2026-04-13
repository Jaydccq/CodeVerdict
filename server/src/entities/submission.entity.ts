import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Problem } from './problem.entity';
import { Exam } from './exam.entity';

export interface TestResultEntry {
  index: number;
  passed: boolean;
  status: string;
  statusId: number;
  time: number | null;
  wallTime: number | null;
  memory: number | null;
  exitCode: number | null;
}

@Entity('submissions')
@Index(['userId', 'examId'])
@Index(['userId', 'problemId'])
@Index(['examId', 'verdict'])
export class Submission extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  problemId: number;

  @Column()
  examId: number;

  @Column({ type: 'text', nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string | null;

  @Column({ type: 'int', nullable: true })
  languageId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  testResults: TestResultEntry[] | null;

  @Column({ type: 'int', nullable: true, default: null })
  totalTestCases: number | null;

  @Column({ type: 'int', nullable: true, default: null })
  passedTestCases: number | null;

  @Column({ type: 'text', array: true, nullable: true })
  selectedOptionIds: string[] | null;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  verdict: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  score: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  submittedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  problem: Problem;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
