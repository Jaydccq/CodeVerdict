import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaderboardUniqueIndex1773766557100 implements MigrationInterface {
  name = 'AddLeaderboardUniqueIndex1773766557100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_leaderboard_exam_user" ON "leaderboard_view" ("examId", "userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_leaderboard_exam_user"`);
  }
}
