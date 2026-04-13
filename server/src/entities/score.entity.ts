import { Entity, Column, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Problem } from './problem.entity';
import { Exam } from './exam.entity';
import { Submission } from './submission.entity';

@Entity('scores')
@Unique(['userId', 'problemId', 'examId'])
@Index(['examId'])
@Index('IDX_scores_exam_user', ['examId', 'userId'])
@Index('IDX_scores_exam_firstSolved', ['examId', 'firstSolvedAt'])
export class Score extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  problemId: number;

  @Column()
  examId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bestScore: number;

  @Column({ nullable: true })
  bestSubmissionId: number | null;

  @Column({ type: 'int', default: 0 })
  totalAttempts: number;

  @Column({ type: 'int', default: 0 })
  wrongAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  firstSolvedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  problem: Problem;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;

  @ManyToOne(() => Submission, { nullable: true, onDelete: 'SET NULL' })
  bestSubmission: Submission;
}
