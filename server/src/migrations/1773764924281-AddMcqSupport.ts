import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcqSupport1773764924281 implements MigrationInterface {
  name = 'AddMcqSupport1773764924281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'leaderboard_view', 'public'],
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
    await queryRunner.query(
      `ALTER TABLE "problems" ADD "questionType" character varying(10) NOT NULL DEFAULT 'coding'`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" ADD "isMultiSelect" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" ADD "questionImageData" text`,
    );
    await queryRunner.query(`ALTER TABLE "problems" ADD "mcqOptions" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD "selectedOptionIds" integer array`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ALTER COLUMN "allowedLanguages" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "code" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "language" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "languageId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "totalTestCases" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "totalTestCases" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "passedTestCases" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "passedTestCases" DROP DEFAULT`,
    );
    await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS 
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
  `);
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'public',
        'MATERIALIZED_VIEW',
        'leaderboard_view',
        'SELECT\n      s."examId",\n      s."userId",\n      u."rollNumber",\n      u."firstName",\n      u."lastName",\n      COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL AND p."questionType" = \'coding\' THEN 1 END)::int AS "solvedCount",\n      COALESCE(SUM(s."bestScore"), 0)::decimal(10,2) AS "totalScore",\n      COALESCE(\n        SUM(\n          CASE WHEN s."firstSolvedAt" IS NOT NULL AND p."questionType" = \'coding\' THEN\n            EXTRACT(EPOCH FROM (s."firstSolvedAt" - e."startTime")) / 60.0\n            + s."wrongAttempts" * 5\n          ELSE 0 END\n        ), 0\n      )::numeric AS "totalPenaltyTime",\n      MAX(s."firstSolvedAt") AS "lastSolvedAt",\n      jsonb_object_agg(\n        s."problemId"::text,\n        jsonb_build_object(\n          \'score\', s."bestScore",\n          \'solved\', s."firstSolvedAt" IS NOT NULL,\n          \'attempts\', s."totalAttempts"\n        )\n      ) AS "problemScores"\n    FROM scores s\n    JOIN users u ON u.id = s."userId"\n    JOIN exams e ON e.id = s."examId"\n    JOIN problems p ON p.id = s."problemId"\n    WHERE e."isActive" = true\n    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'leaderboard_view', 'public'],
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "passedTestCases" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "passedTestCases" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "totalTestCases" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "totalTestCases" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "languageId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "language" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ALTER COLUMN "allowedLanguages" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN "selectedOptionIds"`,
    );
    await queryRunner.query(`ALTER TABLE "problems" DROP COLUMN "mcqOptions"`);
    await queryRunner.query(
      `ALTER TABLE "problems" DROP COLUMN "questionImageData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" DROP COLUMN "isMultiSelect"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" DROP COLUMN "questionType"`,
    );
    await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS SELECT
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
    WHERE e."isActive" = true
    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"`);
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'public',
        'MATERIALIZED_VIEW',
        'leaderboard_view',
        'SELECT\n      s."examId",\n      s."userId",\n      u."rollNumber",\n      u."firstName",\n      u."lastName",\n      COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL THEN 1 END)::int AS "solvedCount",\n      COALESCE(SUM(s."bestScore"), 0)::numeric AS "totalScore",\n      COALESCE(\n        SUM(\n          CASE WHEN s."firstSolvedAt" IS NOT NULL THEN\n            EXTRACT(EPOCH FROM (s."firstSolvedAt" - e."startTime")) / 60.0\n            + s."wrongAttempts" * 5\n          ELSE 0 END\n        ), 0\n      )::numeric AS "totalPenaltyTime",\n      MAX(s."firstSolvedAt") AS "lastSolvedAt",\n      jsonb_object_agg(\n        s."problemId"::text,\n        jsonb_build_object(\n          \'score\', s."bestScore",\n          \'solved\', s."firstSolvedAt" IS NOT NULL,\n          \'attempts\', s."totalAttempts"\n        )\n      ) AS "problemScores"\n    FROM scores s\n    JOIN users u ON u.id = s."userId"\n    JOIN exams e ON e.id = s."examId"\n    WHERE e."isActive" = true\n    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"',
      ],
    );
  }
}
