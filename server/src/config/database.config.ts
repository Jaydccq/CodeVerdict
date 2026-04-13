import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SECRETS } from './env';

const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: SECRETS.DB_HOST,
  port: SECRETS.DB_PORT,
  username: SECRETS.DB_USERNAME,
  password: SECRETS.DB_PASSWORD,
  database: SECRETS.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  extra: {
    max: SECRETS.DB_POOL_SIZE,
  },
  synchronize: false,
  logging: SECRETS.NODE_ENV === 'dev',
  migrationsTransactionMode: 'each',
});

export default databaseConfig;
