import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Entity('users')
@Index(['role'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  rollNumber: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  countryCode?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, string | number | boolean>;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;
}
