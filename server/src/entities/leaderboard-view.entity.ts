import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'leaderboard_view',
  materialized: true,
  expression: `
    SELECT
      s."examId",
      s."userId",
      u."rollNumber",
      u."firstName",
      u."lastName",
      COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL AND p."questionType" = 'coding' THEN 1 END)::int AS "solvedCount",
      COALESCE(SUM(s."bestScore"), 0)::decimal(10,2) AS "totalScore",
      COALESCE(
        SUM(
          CASE WHEN s."firstSolvedAt" IS NOT NULL AND p."questionType" = 'coding' THEN
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
    JOIN problems p ON p.id = s."problemId"
    WHERE e."isActive" = true
    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"
  `,
})
export class LeaderboardView {
  @ViewColumn()
  examId: number;

  @ViewColumn()
  userId: number;

  @ViewColumn()
  rollNumber: string;

  @ViewColumn()
  firstName: string;

  @ViewColumn()
  lastName: string;

  @ViewColumn()
  solvedCount: number;

  @ViewColumn()
  totalScore: number;

  @ViewColumn()
  totalPenaltyTime: number;

  @ViewColumn()
  lastSolvedAt: Date | null;

  @ViewColumn()
  problemScores: Record<
    string,
    { score: number; solved: boolean; attempts: number }
  >;
}
