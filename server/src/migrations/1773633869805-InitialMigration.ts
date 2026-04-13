import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1773633869805 implements MigrationInterface {
  name = 'InitialMigration1773633869805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('STUDENT', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "rollNumber" character varying(20) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "countryCode" character varying(5), "phoneNumber" character varying(20), "metadata" jsonb, "role" "public"."users_role_enum" NOT NULL DEFAULT 'STUDENT', CONSTRAINT "UQ_f3babcc3cad05038414424b3140" UNIQUE ("rollNumber"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
    );
    await queryRunner.query(
      `CREATE TABLE "test_cases" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "problemId" integer NOT NULL, "input" text NOT NULL, "expectedOutput" text NOT NULL, "isVisible" boolean NOT NULL DEFAULT false, "displayOrder" integer NOT NULL, CONSTRAINT "UQ_abfb588af8d862f3f63bd6dc251" UNIQUE ("problemId", "displayOrder"), CONSTRAINT "PK_39eb2dc90c54d7a036b015f05c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."problems_difficulty_enum" AS ENUM('easy', 'medium', 'hard')`,
    );
    await queryRunner.query(
      `CREATE TABLE "problems" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying(255) NOT NULL, "description" text NOT NULL, "inputFormat" text, "outputFormat" text, "constraints" text, "sampleInput" text, "sampleOutput" text, "difficulty" "public"."problems_difficulty_enum" NOT NULL DEFAULT 'medium', "timeLimitMs" integer NOT NULL DEFAULT '2000', "memoryLimitKb" integer NOT NULL DEFAULT '262144', "maxScore" integer NOT NULL DEFAULT '10', "starterCode" jsonb, CONSTRAINT "PK_b3994afba6ab64a42cda1ccaeff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exams" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying(255) NOT NULL, "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE NOT NULL, "durationMinutes" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "allowedLanguages" jsonb NOT NULL, CONSTRAINT "PK_b43159ee3efa440952794b4f53e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_038074cd613a3c6df5f6a3e28f" ON "exams" ("isActive", "endTime") `,
    );
    await queryRunner.query(
      `CREATE TABLE "submissions" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "problemId" integer NOT NULL, "examId" integer NOT NULL, "code" text NOT NULL, "language" character varying(50) NOT NULL, "languageId" integer NOT NULL, "testResults" jsonb, "totalTestCases" integer NOT NULL DEFAULT '0', "passedTestCases" integer NOT NULL DEFAULT '0', "verdict" character varying(50) NOT NULL DEFAULT 'pending', "score" numeric(10,2) NOT NULL DEFAULT '0', "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_10b3be95b8b2fb1e482e07d706b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ebd70c35df5200d635e7cd5ec0" ON "submissions" ("examId", "verdict") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca56f6e36d6b0b4b54fb25ea45" ON "submissions" ("userId", "problemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0fa9e9f97cf8bcdbb70bad2510" ON "submissions" ("userId", "examId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "scores" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "problemId" integer NOT NULL, "examId" integer NOT NULL, "bestScore" numeric(10,2) NOT NULL DEFAULT '0', "bestSubmissionId" integer, "totalAttempts" integer NOT NULL DEFAULT '0', "wrongAttempts" integer NOT NULL DEFAULT '0', "firstSolvedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_5ff31f1406fb18fca0403b24544" UNIQUE ("userId", "problemId", "examId"), CONSTRAINT "PK_c36917e6f26293b91d04b8fd521" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8fecb9004ad527f487105333c2" ON "scores" ("examId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."run_logs_inputtype_enum" AS ENUM('sample', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "run_logs" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "problemId" integer NOT NULL, "examId" integer NOT NULL, "sourceCode" text NOT NULL, "language" character varying(50) NOT NULL, "languageId" integer NOT NULL, "inputType" "public"."run_logs_inputtype_enum" NOT NULL DEFAULT 'sample', "customInput" text, "results" jsonb, "executedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_a7e453f59dee3f9e1e47c453203" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_edc0a2ef1f1893d1203a7254e0" ON "run_logs" ("problemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6db2b8c8490864f783fea7b6b0" ON "run_logs" ("examId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "problem_views" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "problemId" integer NOT NULL, "examId" integer NOT NULL, "viewCount" integer NOT NULL DEFAULT '1', "firstViewedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "lastViewedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "UQ_4575cc9820ff78af31e4e91accb" UNIQUE ("userId", "problemId", "examId"), CONSTRAINT "PK_0a42e4edcf6a56d01ab02d333bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e88c1d2d8410b704832de158b" ON "problem_views" ("examId", "problemId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_enrollments" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "examId" integer NOT NULL, "enrolledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_94de1ccebb8ef3ab556b63d9d2d" UNIQUE ("userId", "examId"), CONSTRAINT "PK_060b601c1fb15d2a82d7b508733" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auto_saves" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "examId" integer NOT NULL, "codeState" jsonb NOT NULL, CONSTRAINT "UQ_64b5fb96c4eea0460876351ed40" UNIQUE ("userId", "examId"), CONSTRAINT "PK_b28b732d2f947b0032b99f551b3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "problem_to_exam" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "problemId" integer NOT NULL, "examId" integer NOT NULL, "displayOrder" integer NOT NULL, CONSTRAINT "UQ_e879bd1316d5daf12f71bf00c3c" UNIQUE ("examId", "displayOrder"), CONSTRAINT "UQ_4d0a9b3f353030543b018e18f5c" UNIQUE ("examId", "problemId"), CONSTRAINT "PK_41e199a5e56b7537e3f7c841eb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_cases" ADD CONSTRAINT "FK_0126d367e92400b37cd7da0cda6" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_eae888413ab8fc63cc48759d46a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_a659ade908bd365bf760853fd4f" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_f2f7f7ccde3bf5c6f70bd378a94" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" ADD CONSTRAINT "FK_c0508b319d67f890b4118099680" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" ADD CONSTRAINT "FK_2163556f209620c4ed292cb0980" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" ADD CONSTRAINT "FK_8fecb9004ad527f487105333c26" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" ADD CONSTRAINT "FK_dfbdadb64f68dd4bf730ccc45b5" FOREIGN KEY ("bestSubmissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" ADD CONSTRAINT "FK_156c5c5994f1c31693e4ee061c3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" ADD CONSTRAINT "FK_edc0a2ef1f1893d1203a7254e04" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" ADD CONSTRAINT "FK_6cdb8f5bb021bfc1dc0a7cec4e0" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" ADD CONSTRAINT "FK_87142fb954e3f05f6c6ad1fec97" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" ADD CONSTRAINT "FK_6b1ae77756c5ffdd8c4b21ae5c4" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" ADD CONSTRAINT "FK_a94ad2bb45d6efe536961ff5883" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_enrollments" ADD CONSTRAINT "FK_03f17ba1dbf56244465127e8b8f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_enrollments" ADD CONSTRAINT "FK_61c04fa7b4fa943b60b924939b1" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_saves" ADD CONSTRAINT "FK_96e8b8a802c424babf0d44eada1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_saves" ADD CONSTRAINT "FK_bfa95bf62b4185b4706680e8569" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_to_exam" ADD CONSTRAINT "FK_a8e08da9924b142abc9aa6f0811" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_to_exam" ADD CONSTRAINT "FK_3a245de2ff28327b36f79cf65cc" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS 
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
          CASE WHEN s."firstSolvedAt" IS NOT NULL THEN
            EXTRACT(EPOCH FROM (s."firstSolvedAt" - e."startTime")) / 60.0
            + s."wrongAttempts" * 5
          ELSE 0 END
        ), 0
      )::decimal(10,2) AS "totalPenaltyTime",
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
    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"
  `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "leaderboard_view_unique_idx" ON "leaderboard_view" ("examId", "userId")`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'public',
        'MATERIALIZED_VIEW',
        'leaderboard_view',
        'SELECT\n      s."examId",\n      s."userId",\n      u."rollNumber",\n      u."firstName",\n      u."lastName",\n      COUNT(CASE WHEN s."firstSolvedAt" IS NOT NULL THEN 1 END)::int AS "solvedCount",\n      COALESCE(SUM(s."bestScore"), 0)::decimal(10,2) AS "totalScore",\n      COALESCE(\n        SUM(\n          CASE WHEN s."firstSolvedAt" IS NOT NULL THEN\n            EXTRACT(EPOCH FROM (s."firstSolvedAt" - e."startTime")) / 60.0\n            + s."wrongAttempts" * 5\n          ELSE 0 END\n        ), 0\n      )::decimal(10,2) AS "totalPenaltyTime",\n      jsonb_object_agg(\n        s."problemId"::text,\n        jsonb_build_object(\n          \'score\', s."bestScore",\n          \'solved\', s."firstSolvedAt" IS NOT NULL,\n          \'attempts\', s."totalAttempts"\n        )\n      ) AS "problemScores"\n    FROM scores s\n    JOIN users u ON u.id = s."userId"\n    JOIN exams e ON e.id = s."examId"\n    GROUP BY s."examId", s."userId", u."rollNumber", u."firstName", u."lastName"',
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
      `ALTER TABLE "problem_to_exam" DROP CONSTRAINT "FK_3a245de2ff28327b36f79cf65cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_to_exam" DROP CONSTRAINT "FK_a8e08da9924b142abc9aa6f0811"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_saves" DROP CONSTRAINT "FK_bfa95bf62b4185b4706680e8569"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auto_saves" DROP CONSTRAINT "FK_96e8b8a802c424babf0d44eada1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_enrollments" DROP CONSTRAINT "FK_61c04fa7b4fa943b60b924939b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_enrollments" DROP CONSTRAINT "FK_03f17ba1dbf56244465127e8b8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" DROP CONSTRAINT "FK_a94ad2bb45d6efe536961ff5883"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" DROP CONSTRAINT "FK_6b1ae77756c5ffdd8c4b21ae5c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problem_views" DROP CONSTRAINT "FK_87142fb954e3f05f6c6ad1fec97"`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" DROP CONSTRAINT "FK_6cdb8f5bb021bfc1dc0a7cec4e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" DROP CONSTRAINT "FK_edc0a2ef1f1893d1203a7254e04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "run_logs" DROP CONSTRAINT "FK_156c5c5994f1c31693e4ee061c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" DROP CONSTRAINT "FK_dfbdadb64f68dd4bf730ccc45b5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" DROP CONSTRAINT "FK_8fecb9004ad527f487105333c26"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" DROP CONSTRAINT "FK_2163556f209620c4ed292cb0980"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scores" DROP CONSTRAINT "FK_c0508b319d67f890b4118099680"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_f2f7f7ccde3bf5c6f70bd378a94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_a659ade908bd365bf760853fd4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_eae888413ab8fc63cc48759d46a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_cases" DROP CONSTRAINT "FK_0126d367e92400b37cd7da0cda6"`,
    );
    await queryRunner.query(`DROP TABLE "problem_to_exam"`);
    await queryRunner.query(`DROP TABLE "auto_saves"`);
    await queryRunner.query(`DROP TABLE "exam_enrollments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e88c1d2d8410b704832de158b"`,
    );
    await queryRunner.query(`DROP TABLE "problem_views"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6db2b8c8490864f783fea7b6b0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edc0a2ef1f1893d1203a7254e0"`,
    );
    await queryRunner.query(`DROP TABLE "run_logs"`);
    await queryRunner.query(`DROP TYPE "public"."run_logs_inputtype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8fecb9004ad527f487105333c2"`,
    );
    await queryRunner.query(`DROP TABLE "scores"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0fa9e9f97cf8bcdbb70bad2510"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ca56f6e36d6b0b4b54fb25ea45"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ebd70c35df5200d635e7cd5ec0"`,
    );
    await queryRunner.query(`DROP TABLE "submissions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_038074cd613a3c6df5f6a3e28f"`,
    );
    await queryRunner.query(`DROP TABLE "exams"`);
    await queryRunner.query(`DROP TABLE "problems"`);
    await queryRunner.query(`DROP TYPE "public"."problems_difficulty_enum"`);
    await queryRunner.query(`DROP TABLE "test_cases"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
