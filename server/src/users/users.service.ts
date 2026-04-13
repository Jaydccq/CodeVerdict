import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, Not } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { CreateUserDto } from '../admin/dto/create-user.dto';
import { UpdateUserDto } from '../admin/dto/update-user.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: RegisterDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { rollNumber: dto.rollNumber }],
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'roll number';
      throw new ConflictException(`User with this ${field} already exists`);
    }

    const { qaRoleOptIn, ...rest } = dto;
    const hashedPassword = await bcrypt.hash(rest.password, 10);
    const user = this.userRepo.create({
      ...rest,
      password: hashedPassword,
      metadata: { qaRoleOptIn: qaRoleOptIn ?? false },
    });

    try {
      return await this.userRepo.save(user);
    } catch (err) {
      // Concurrent registration can slip through the findOne check above;
      // convert the DB unique-constraint violation to a clean 409 response.
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'User with this email or roll number already exists',
        );
      }
      throw err;
    }
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async count(excludeAdmins: boolean = false): Promise<number> {
    return this.userRepo.count({
      where: excludeAdmins ? { role: Not(UserRole.ADMIN) } : undefined,
    });
  }

  async updateRole(id: number, role: User['role']): Promise<User> {
    const user = await this.findByIdOrFail(id);
    user.role = role;
    return this.userRepo.save(user);
  }

  async findAll(
    pagination?: PaginationDto,
    options?: { qaRoleOptIn?: boolean },
  ): Promise<PaginatedResponse<User>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const search = pagination?.search?.trim();

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(user.rollNumber) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (options?.qaRoleOptIn) {
      qb.andWhere("user.metadata->>'qaRoleOptIn' = :qaVal", {
        qaVal: 'true',
      });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async adminCreate(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { rollNumber: dto.rollNumber }],
    });
    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'roll number';
      throw new ConflictException(`User with this ${field} already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      rollNumber: dto.rollNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role ?? UserRole.STUDENT,
    });

    try {
      return await this.userRepo.save(user);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'User with this email or roll number already exists',
        );
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findByIdOrFail(id);
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.countryCode !== undefined) user.countryCode = dto.countryCode;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.role !== undefined) user.role = dto.role;
    return this.userRepo.save(user);
  }

  async updateMetadata(
    id: number,
    patch: Record<string, string | number | boolean>,
  ): Promise<User> {
    const user = await this.findByIdOrFail(id);
    user.metadata = { ...user.metadata, ...patch };
    return this.userRepo.save(user);
  }

  async delete(id: number): Promise<{ deleted: true }> {
    const user = await this.findByIdOrFail(id);
    await this.userRepo.remove(user);
    return { deleted: true };
  }
}
