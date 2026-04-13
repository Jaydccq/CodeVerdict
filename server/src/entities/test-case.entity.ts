import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Problem } from './problem.entity';

@Entity('test_cases')
@Unique(['problem', 'displayOrder'])
export class TestCase extends BaseEntity {
  @Column()
  problemId: number;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text' })
  expectedOutput: string;

  @Column({ type: 'boolean', default: false })
  isVisible: boolean;

  @Column({ type: 'int' })
  displayOrder: number;

  @ManyToOne(() => Problem, (problem) => problem.testCases, {
    onDelete: 'CASCADE',
  })
  problem: Problem;
}
