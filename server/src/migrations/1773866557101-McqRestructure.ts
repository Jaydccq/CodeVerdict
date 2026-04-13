import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MCQ Restructure Migration
 *
 * Changes:
 * 1. Convert mcqOptions option IDs from integer indices to deterministic UUID strings.
 *    Uses md5(problemId || '-' || oldIndex) so existing submissions can be remapped.
 * 2. Convert submissions.selectedOptionIds from integer[] to text[] using the same mapping.
 * 3. Update leaderboard_view: solvedCount now includes correct MCQ answers
 *    (removed the `questionType = 'coding'` filter on solvedCount; penalty time stays
 *    coding-only). The JOIN to problems is kept for penalty time filtering.
 */
export class McqRestructure1773866557101 implements MigrationInterface {
  name = 'McqRestructure1773866557101';

  private static uuidExpr(problemIdCol: string, indexExpr: string): string {
    const h = `md5(${problemIdCol}::text || '-' || (${indexExpr})::text)`;
    return `CONCAT(
      SUBSTRING(${h}, 1, 8), '-',
      SUBSTRING(${h}, 9, 4), '-',
      SUBSTRING(${h}, 13, 4), '-',
      SUBSTRING(${h}, 17, 4), '-',
      SUBSTRING(${h}, 21, 12)
    )`;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Convert mcqOptions IDs to UUID strings ──────────────────────────
    await queryRunner.query(`
      UPDATE problems
      SET "mcqOptions" = (
        SELECT jsonb_agg(
          (t.opt - 'id') || jsonb_build_object(
            'id',
            ${McqRestructure1773866557101.uuidExpr('problems.id', 't.idx - 1')}
          )
        )
        FROM jsonb_array_elements("mcqOptions") WITH ORDINALITY AS t(opt, idx)
      )
      WHERE "questionType" = 'mcq' AND "mcqOptions" IS NOT NULL
    `);

    // ── 2. Add temporary text[] column for selectedOptionIds ───────────────
    await queryRunner.query(
      `ALTER TABLE submissions ADD COLUMN "selectedOptionIdsNew" text[]`,
    );

    // ── 3. Remap existing integer selectedOptionIds to UUID strings ─────────
    await queryRunner.query(`
      UPDATE submissions s
      SET "selectedOptionIdsNew" = (
        SELECT array_agg(
          ${McqRestructure1773866557101.uuidExpr('s."problemId"', 'oid')}
        )
        FROM unnest(s."selectedOptionIds") AS oid
      )
      WHERE s."selectedOptionIds" IS NOT NULL
    `);

    // ── 4. Swap columns ─────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE submissions DROP COLUMN "selectedOptionIds"`,
    );
    await queryRunner.query(
      `ALTER TABLE submissions RENAME COLUMN "selectedOptionIdsNew" TO "selectedOptionIds"`,
    );

    // ── 5. Rebuild leaderboard_view ─────────────────────────────────────────
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'leaderboard_view', 'public'],
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);

    const viewSql = `
    SELECT
      s."examId",
      s."userId",
      u."rollNumber",
      u."firstName",
      u."lastName",
      COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL THEN 1 END)::int AS "solvedCount",
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
    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"`;

    await queryRunner.query(
      `CREATE MATERIALIZED VIEW "leaderboard_view" AS ${viewSql}`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "leaderboard_view_unique_idx" ON "leaderboard_view" ("examId", "userId")`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      ['public', 'MATERIALIZED_VIEW', 'leaderboard_view', viewSql.trim()],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Restore leaderboard_view (MCQ-excluded solvedCount) ─────────────────
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'leaderboard_view', 'public'],
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);

    const oldViewSql = `
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
    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"`;

    await queryRunner.query(
      `CREATE MATERIALIZED VIEW "leaderboard_view" AS ${oldViewSql}`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "leaderboard_view_unique_idx" ON "leaderboard_view" ("examId", "userId")`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      ['public', 'MATERIALIZED_VIEW', 'leaderboard_view', oldViewSql.trim()],
    );

    // ── Restore selectedOptionIds as integer[] (submissions data is lost) ───
    await queryRunner.query(
      `ALTER TABLE submissions ADD COLUMN "selectedOptionIdsOld" integer[]`,
    );
    await queryRunner.query(
      `ALTER TABLE submissions DROP COLUMN "selectedOptionIds"`,
    );
    await queryRunner.query(
      `ALTER TABLE submissions RENAME COLUMN "selectedOptionIdsOld" TO "selectedOptionIds"`,
    );

    // ── Restore numeric IDs in mcqOptions (index-based) ────────────────────
    await queryRunner.query(`
      UPDATE problems
      SET "mcqOptions" = (
        SELECT jsonb_agg((t.opt - 'id') || jsonb_build_object('id', t.idx - 1))
        FROM jsonb_array_elements("mcqOptions") WITH ORDINALITY AS t(opt, idx)
      )
      WHERE "questionType" = 'mcq' AND "mcqOptions" IS NOT NULL
    `);
  }
}
