import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Score } from '../entities/score.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { SlackService } from '../common/slack.service';
import { Exam } from '../entities/exam.entity';
import { CreateScoreDto } from '../admin/dto/create-score.dto';
import { UpdateScoreDto } from '../admin/dto/update-score.dto';

interface CountRow {
  cnt: string;
}

interface AggregatedRow {
  userId: string;
  examId: string;
  totalScore: string;
  totalAttempts: string;
  totalWrongAttempts: string;
  problemCount: string;
  solvedCount: string;
  earliestSolvedAt: string | null;
  userRollNumber: string;
  userFirstName: string;
  userLastName: string;
  examTitle: string;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    private readonly dataSource: DataSource,
    private readonly slackService: SlackService,
  ) {}

  /**
   * ICPC-style scoring:
   * - Only scores when ALL test cases pass
   * - effectiveTime = solveTime + (wrongAttempts * 5 min)
   * - remainingTime = totalDuration - effectiveTime
   * - score = max(3, 10 * (remainingTime / totalDuration))
   */
  async updateScore(
    userId: number,
    problemId: number,
    exam: Exam,
    submissionId: number,
    allPassed: boolean,
    maxScore: number = 10,
    externalManager?: EntityManager,
  ): Promise<number> {
    const run = async (manager: EntityManager) => {
      const scoreRepo = manager.getRepository(Score);

      // Lock the row for this user+problem+exam
      let score = await scoreRepo.findOne({
        where: { userId, problemId, examId: exam.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!score) {
        score = scoreRepo.create({
          userId,
          problemId,
          examId: exam.id,
          bestScore: 0,
          totalAttempts: 0,
          wrongAttempts: 0,
          firstSolvedAt: null,
          bestSubmissionId: null,
        });
      }

      score.totalAttempts += 1;

      if (!allPassed) {
        // Only increment wrong if not already solved
        if (!score.firstSolvedAt) {
          score.wrongAttempts += 1;
        }
        await scoreRepo.save(score);
        return 0;
      }

      // All passed - calculate ICPC score
      if (!score.firstSolvedAt) {
        score.firstSolvedAt = new Date();
      }

      const solveTimeMin =
        (score.firstSolvedAt.getTime() - exam.startTime.getTime()) / 60000;
      const penaltyMin = score.wrongAttempts * 5;
      const effectiveTimeMin = solveTimeMin + penaltyMin;
      const remainingTimeMin = exam.durationMinutes - effectiveTimeMin;

      const newScore = Math.max(
        1,
        maxScore * (remainingTimeMin / exam.durationMinutes),
      );

      if (newScore > Number(score.bestScore)) {
        score.bestScore = newScore;
        score.bestSubmissionId = submissionId;
      }

      await scoreRepo.save(score);
      return Number(score.bestScore);
    };

    if (externalManager) {
      return run(externalManager);
    }
    return this.dataSource.transaction(run);
  }

  async refreshLeaderboard(): Promise<void> {
    try {
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view',
      );
    } catch (err: unknown) {
      const detail =
        err instanceof Error
          ? JSON.stringify(
              { ...err, message: err.message, stack: err.stack },
              null,
              2,
            )
          : JSON.stringify(err, null, 2);
      this.logger.error(`Leaderboard refresh failed: ${detail}`);
      await this.slackService.alert(
        `:warning: Leaderboard refresh failed (post-submission):\n\`\`\`${detail}\`\`\``,
      );
    }
  }

  async findAll(
    examId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<Score>> {
    const where: Record<string, unknown> = {};
    if (examId) where.examId = examId;
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const [scores, total] = await this.scoreRepo.findAndCount({
      where,
      relations: ['user', 'problem', 'exam'],
      order: { bestScore: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: scores, total, page, limit };
  }

  async findAggregated(
    examId?: number,
    pagination?: PaginationDto,
    options?: { qaRoleOptIn?: boolean },
  ) {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);

    const qb = this.scoreRepo
      .createQueryBuilder('s')
      .select('s."userId"', 'userId')
      .addSelect('s."examId"', 'examId')
      .addSelect('SUM(s."bestScore"::numeric)', 'totalScore')
      .addSelect('SUM(s."totalAttempts")', 'totalAttempts')
      .addSelect('SUM(s."wrongAttempts")', 'totalWrongAttempts')
      .addSelect('COUNT(s.id)', 'problemCount')
      .addSelect(
        'COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL THEN 1 END)',
        'solvedCount',
      )
      .addSelect('MIN(s."firstSolvedAt")', 'earliestSolvedAt')
      .innerJoin('s.user', 'u')
      .addSelect('u."rollNumber"', 'userRollNumber')
      .addSelect('u."firstName"', 'userFirstName')
      .addSelect('u."lastName"', 'userLastName')
      .innerJoin('s.exam', 'e')
      .addSelect('e.title', 'examTitle')
      .groupBy('s."userId"')
      .addGroupBy('s."examId"')
      .addGroupBy('u."rollNumber"')
      .addGroupBy('u."firstName"')
      .addGroupBy('u."lastName"')
      .addGroupBy('e.title')
      .orderBy('"totalScore"', 'DESC');

    if (examId) {
      qb.where('s."examId" = :examId', { examId });
    }

    if (options?.qaRoleOptIn) {
      qb.andWhere("u.metadata->>'qaRoleOptIn' = :qaVal", { qaVal: 'true' });
    }

    const countQb = this.scoreRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT CONCAT(s."userId", \'-\', s."examId"))', 'cnt');
    if (examId) {
      countQb.where('s."examId" = :examId', { examId });
    }
    if (options?.qaRoleOptIn) {
      countQb
        .innerJoin('s.user', 'u')
        .andWhere("u.metadata->>'qaRoleOptIn' = :qaVal", { qaVal: 'true' });
    }
    const countResult = await countQb.getRawOne<CountRow>();
    const total = Number(countResult?.cnt ?? 0);

    const data = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<AggregatedRow>();

    return {
      data: data.map((r) => ({
        userId: Number(r.userId),
        examId: Number(r.examId),
        totalScore: Number(r.totalScore),
        totalAttempts: Number(r.totalAttempts),
        totalWrongAttempts: Number(r.totalWrongAttempts),
        problemCount: Number(r.problemCount),
        solvedCount: Number(r.solvedCount),
        earliestSolvedAt: r.earliestSolvedAt,
        user: {
          rollNumber: r.userRollNumber,
          firstName: r.userFirstName,
          lastName: r.userLastName,
        },
        exam: { title: r.examTitle },
      })),
      total,
      page,
      limit,
    };
  }

  async findByUserExam(userId: number, examId: number): Promise<Score[]> {
    return this.scoreRepo.find({
      where: { userId, examId },
      relations: ['problem', 'exam', 'user'],
      order: { bestScore: 'DESC' },
    });
  }

  async findOne(id: number) {
    const score = await this.scoreRepo.findOne({
      where: { id },
      relations: ['user', 'problem', 'exam'],
    });
    if (!score) throw new NotFoundException('Score not found');
    return score;
  }

  async create(dto: CreateScoreDto) {
    const score = this.scoreRepo.create({
      userId: dto.userId,
      problemId: dto.problemId,
      examId: dto.examId,
      bestScore: dto.bestScore ?? 0,
      totalAttempts: dto.totalAttempts ?? 0,
      wrongAttempts: dto.wrongAttempts ?? 0,
      firstSolvedAt: dto.firstSolvedAt ? new Date(dto.firstSolvedAt) : null,
      bestSubmissionId: null,
    });
    return this.scoreRepo.save(score);
  }

  async update(id: number, dto: UpdateScoreDto) {
    const score = await this.scoreRepo.findOne({ where: { id } });
    if (!score) throw new NotFoundException('Score not found');
    if (dto.bestScore !== undefined) score.bestScore = dto.bestScore;
    if (dto.wrongAttempts !== undefined)
      score.wrongAttempts = dto.wrongAttempts;
    if (dto.totalAttempts !== undefined)
      score.totalAttempts = dto.totalAttempts;
    if (dto.firstSolvedAt !== undefined)
      score.firstSolvedAt = dto.firstSolvedAt
        ? new Date(dto.firstSolvedAt)
        : null;
    return this.scoreRepo.save(score);
  }

  async delete(id: number): Promise<{ deleted: true }> {
    const score = await this.scoreRepo.findOne({ where: { id } });
    if (!score) throw new NotFoundException('Score not found');
    await this.scoreRepo.remove(score);
    return { deleted: true };
  }
}
