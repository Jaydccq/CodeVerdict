import { DataSource } from 'typeorm';

export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  // TRUNCATE in dependency order with CASCADE to handle FK constraints
  await dataSource.query(`
    TRUNCATE TABLE
      auto_saves,
      run_logs,
      problem_views,
      submissions,
      scores,
      test_cases,
      problems,
      exams,
      users
    CASCADE
  `);
}
