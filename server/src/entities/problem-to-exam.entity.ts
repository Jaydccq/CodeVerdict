import { Entity, Column, Unique, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Problem } from './problem.entity';
import { Exam } from './exam.entity';

@Entity('problem_to_exam')
@Unique(['examId', 'problemId'])
@Unique(['examId', 'displayOrder'])
export class ProblemToExam extends BaseEntity {
  @Column()
  problemId: number;

  @Column()
  examId: number;

  @Column({ type: 'int' })
  displayOrder: number;

  @ManyToOne(() => Problem, { onDelete: 'CASCADE' })
  problem: Problem;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
