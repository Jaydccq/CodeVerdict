import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  const dbName = process.env.DB_NAME || 'exam_platform_test';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default DB to create/drop
  });

  await client.connect();

  // Terminate existing connections to the test database
  await client.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid()
  `);

  await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await client.query(`CREATE DATABASE "${dbName}"`);

  await client.end();
}
