import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProblemView } from '../entities/problem-view.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ProblemViewService {
  constructor(
    @InjectRepository(ProblemView)
    private readonly problemViewRepo: Repository<ProblemView>,
  ) {}

  /**
   * Upsert a view record for the given user+problem+exam combo.
   * Fire-and-forget: the caller does not await this - errors are swallowed
   * because tracking is non-critical.
   */
  trackView(userId: number, problemId: number, examId: number): void {
    this.problemViewRepo
      .findOne({
        where: { userId, problemId, examId },
        select: ['id', 'viewCount'],
      })
      .then(async (existing) => {
        if (existing) {
          await this.problemViewRepo.increment(
            { id: existing.id },
            'viewCount',
            1,
          );
          await this.problemViewRepo.update(existing.id, {
            lastViewedAt: new Date(),
          });
        } else {
          const view = this.problemViewRepo.create({
            userId,
            problemId,
            examId,
            firstViewedAt: new Date(),
            lastViewedAt: new Date(),
          });
          // Swallow unique-constraint violation from concurrent requests
          await this.problemViewRepo.save(view).catch(() => undefined);
        }
      })
      .catch(() => {
        /* tracking is non-critical */
      });
  }

  async findAll(
    filters: { examId?: number; problemId?: number; userId?: number },
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<ProblemView>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);

    const qb = this.problemViewRepo.createQueryBuilder('pv');
    qb.leftJoin('pv.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.rollNumber',
      ])
      .leftJoin('pv.exam', 'exam')
      .addSelect(['exam.id', 'exam.title'])
      .leftJoin('pv.problem', 'problem')
      .addSelect(['problem.id', 'problem.title']);

    if (filters.examId != null)
      qb.andWhere('pv.examId = :examId', { examId: filters.examId });
    if (filters.problemId != null)
      qb.andWhere('pv.problemId = :problemId', {
        problemId: filters.problemId,
      });
    if (filters.userId != null)
      qb.andWhere('pv.userId = :userId', { userId: filters.userId });

    qb.orderBy('pv.lastViewedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
