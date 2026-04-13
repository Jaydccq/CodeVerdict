import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Problem } from './problem.entity';
import { Exam } from './exam.entity';

@Entity('problem_views')
@Unique(['userId', 'problemId', 'examId'])
@Index(['examId', 'problemId'])
export class ProblemView extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  problemId: number;

  @Column()
  examId: number;

  @Column({ type: 'int', default: 1 })
  viewCount: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  firstViewedAt: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastViewedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  problem: Problem;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
