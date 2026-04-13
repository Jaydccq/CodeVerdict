import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InputType, RunLog } from '../entities/run-log.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

export interface SaveRunLogDto {
  userId: number;
  problemId: number;
  examId: number;
  sourceCode: string;
  language: string;
  languageId: number;
  inputType: InputType;
  customInput?: string | null;
  results: unknown[] | null;
}

@Injectable()
export class RunLogService {
  constructor(
    @InjectRepository(RunLog)
    private readonly runLogRepo: Repository<RunLog>,
  ) {}

  save(data: SaveRunLogDto): Promise<RunLog> {
    const runLog = this.runLogRepo.create(data);
    return this.runLogRepo.save(runLog);
  }

  async findAll(
    filters: { examId?: number; problemId?: number; userId?: number },
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<RunLog>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);

    const qb = this.runLogRepo.createQueryBuilder('rl');
    qb.leftJoin('rl.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.rollNumber',
      ])
      .leftJoin('rl.exam', 'exam')
      .addSelect(['exam.id', 'exam.title'])
      .leftJoin('rl.problem', 'problem')
      .addSelect(['problem.id', 'problem.title']);

    if (filters.examId != null)
      qb.andWhere('rl.examId = :examId', { examId: filters.examId });
    if (filters.problemId != null)
      qb.andWhere('rl.problemId = :problemId', {
        problemId: filters.problemId,
      });
    if (filters.userId != null)
      qb.andWhere('rl.userId = :userId', { userId: filters.userId });

    qb.orderBy('rl.executedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
