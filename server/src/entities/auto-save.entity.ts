import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Exam } from './exam.entity';

// { [problemId]: { [languageId]: codeString } }
export interface CodeState {
  [problemId: string]: {
    [languageId: string]: string;
  };
}

@Entity('auto_saves')
@Unique(['userId', 'examId'])
export class AutoSave extends BaseEntity {
  @Column()
  userId: number;

  @Column()
  examId: number;

  @Column({ type: 'jsonb' })
  codeState: CodeState;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  exam: Exam;
}
