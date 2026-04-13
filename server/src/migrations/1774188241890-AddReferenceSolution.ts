import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferenceSolution1774188241890 implements MigrationInterface {
  name = 'AddReferenceSolution1774188241890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "problems" ADD "referenceSolutionCode" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" ADD "referenceSolutionLanguageId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "problems" DROP COLUMN "referenceSolutionLanguageId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" DROP COLUMN "referenceSolutionCode"`,
    );
  }
}
