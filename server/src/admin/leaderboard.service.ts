import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, DataSource } from 'typeorm';
import { LeaderboardView } from '../entities/leaderboard-view.entity';
import { User } from '../entities/user.entity';
import { SlackService } from '../common/slack.service';
import { SECRETS } from '../config/env';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(LeaderboardView)
    private readonly leaderboardRepo: Repository<LeaderboardView>,
    private readonly dataSource: DataSource,
    private readonly slackService: SlackService,
  ) {}

  async getLeaderboard(
    examId: number,
    options?: { qaRoleOptIn?: boolean },
  ): Promise<LeaderboardView[]> {
    const qb = this.leaderboardRepo
      .createQueryBuilder('lb')
      .where('lb.examId = :examId', { examId })
      .orderBy('lb.solvedCount', 'DESC')
      .addOrderBy('lb.totalPenaltyTime', 'ASC')
      .addOrderBy('lb.lastSolvedAt', 'ASC');

    if (options?.qaRoleOptIn) {
      qb.innerJoin(User, 'u', 'u.id = lb."userId"').andWhere(
        "u.metadata->>'qaRoleOptIn' = :qaVal",
        { qaVal: 'true' },
      );
    }

    return qb.getMany();
  }

  async refreshView(): Promise<void> {
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
        `:warning: Leaderboard materialized view refresh failed:\n\`\`\`${detail}\`\`\``,
      );
    }
  }

  /**
   * On-demand query for a specific exam's leaderboard data,
   * computed live from the scores table. Use this for inactive/archived exams
   * that are excluded from the materialized view.
   */
  async getLeaderboardLive(
    examId: number,
    options?: { qaRoleOptIn?: boolean },
  ): Promise<LeaderboardView[]> {
    const params: unknown[] = [examId];
    let qaClause = '';
    if (options?.qaRoleOptIn) {
      params.push('true');
      qaClause = `AND u.metadata->>'qaRoleOptIn' = $${params.length}`;
    }

    return this.dataSource.query(
      `
      SELECT
        s."examId",
        s."userId",
        u."rollNumber",
        u."firstName",
        u."lastName",
        COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL THEN 1 END)::int AS "solvedCount",
        COALESCE(SUM(s."bestScore"), 0)::numeric AS "totalScore",
        COALESCE(
          SUM(
            CASE WHEN s."firstSolvedAt" IS NOT NULL THEN
              EXTRACT(EPOCH FROM (s."firstSolvedAt" - e."startTime")) / 60.0
              + s."wrongAttempts" * 5
            ELSE 0 END
          ), 0
        )::numeric AS "totalPenaltyTime",
        MAX(s."firstSolvedAt") AS "lastSolvedAt",
        jsonb_object_agg(
          s."problemId"::text,
          jsonb_build_object(
            'score', s."bestScore",
            'solved', s."firstSolvedAt" IS NOT NULL,
            'attempts', s."totalAttempts"
          )
        ) AS "problemScores"
      FROM scores s
      JOIN users u ON u.id = s."userId"
      JOIN exams e ON e.id = s."examId"
      WHERE s."examId" = $1 ${qaClause}
      GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"
      ORDER BY "solvedCount" DESC, "totalPenaltyTime" ASC, "lastSolvedAt" ASC
      `,
      params,
    );
  }

  @Cron(SECRETS.LEADERBOARD_CRON)
  async handleCron(): Promise<void> {
    await this.refreshView();
  }
}
