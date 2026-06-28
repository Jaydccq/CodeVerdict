import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('practice_submissions')
@Index(['problemSlug', 'createdAt'])
export class PracticeSubmission extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  problemSlug: string;

  @Column({ type: 'varchar', length: 50 })
  language: string;

  @Column({ type: 'text' })
  sourceCode: string;

  @Column({ type: 'varchar', length: 50 })
  verdict: string;

  @Column({ type: 'int' })
  passedCount: number;

  @Column({ type: 'int' })
  totalCount: number;

  @Column({ type: 'jsonb', nullable: true })
  safeDetailsJson: Record<string, unknown> | null;
}
