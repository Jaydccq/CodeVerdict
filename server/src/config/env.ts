import { config } from 'dotenv';

config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const SECRETS = Object.freeze({
  // Database
  DB_HOST: optional('DB_HOST', 'localhost'),
  DB_PORT: parseInt(optional('DB_PORT', '5432'), 10),
  DB_USERNAME: required('DB_USERNAME'),
  DB_PASSWORD: required('DB_PASSWORD'),
  DB_NAME: required('DB_NAME'),

  // Application
  NODE_ENV: optional('NODE_ENV', 'dev'),
  PORT: parseInt(optional('PORT', '3000'), 10),
  HOST: optional('HOST', '127.0.0.1'),
  APP_NAME: optional('APP_NAME', 'CodeVerdict'),

  // Auth
  JWT_SECRET: optional('JWT_SECRET', 'local-dev-secret'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '1d'),

  // Judge0
  JUDGE0_URL: optional('JUDGE0_URL', 'http://localhost:2358'),
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  RAPIDAPI_HOST: optional('RAPIDAPI_HOST', 'judge0-ce.p.rapidapi.com'),

  // Admin
  ADMIN_SETUP_KEY: optional('ADMIN_SETUP_KEY', 'local-admin-setup-key'),

  // Database pool
  DB_POOL_SIZE: parseInt(optional('DB_POOL_SIZE', '10'), 10),

  // CORS
  CORS_ORIGIN: optional(
    'CORS_ORIGIN',
    'http://127.0.0.1:5173,http://localhost:5173',
  ),

  // Leaderboard
  LEADERBOARD_CRON: optional('LEADERBOARD_CRON', '0 */5 * * * *'),

  // Judge0
  MAX_SUBMISSION_BATCH_SIZE: parseInt(
    optional('MAX_SUBMISSION_BATCH_SIZE', '20'),
    10,
  ),

  // Slack
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_ALERT_CHANNEL: process.env.SLACK_ALERT_CHANNEL,
});
