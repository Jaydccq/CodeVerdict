import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Problem } from './problem.entity';
import { Exam } from './exam.entity';

export enum InputType {
  SAMPLE = 'sample',
  CUSTOM = 'custom',
}

@Entity('run_logs')
@Index(['examId', 'userId'])
export class RunLog extends BaseEntity {
  @Column()
  userId: number;

  @Index()
  @Column()
  problemId: number;

  @Column()
  examId: number;

  @Column({ type: 'text' })
  sourceCode: string;

  @Column({ type: 'varchar', length: 50 })
  language: string;

  @Column()
  languageId: number;

  @Column({ type: 'enum', enum: InputType, default: InputType.SAMPLE })
  inputType: InputType;

  @Column({ type: 'text', nullable: true })
  customInput: string | null;

  @Column({ type: 'jsonb', nullable: true })
  results: unknown[] | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  executedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  problem: Problem;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
