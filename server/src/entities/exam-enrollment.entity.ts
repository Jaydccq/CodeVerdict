import { Entity, Column, ManyToOne, Unique, CreateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Exam } from './exam.entity';

@Entity('exam_enrollments')
@Unique(['userId', 'examId'])
export class ExamEnrollment extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  examId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  enrolledAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
