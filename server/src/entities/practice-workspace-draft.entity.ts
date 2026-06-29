import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('practice_workspace_drafts')
@Index(['problemSlug'])
export class PracticeWorkspaceDraft extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  problemSlug: string;

  @Column({ type: 'jsonb' })
  editedFilesJson: Record<string, string>;
}
