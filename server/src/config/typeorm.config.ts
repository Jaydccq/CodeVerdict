import { DataSource } from 'typeorm';
import { SECRETS } from './env';

export default new DataSource({
  type: 'postgres',
  host: SECRETS.DB_HOST,
  port: SECRETS.DB_PORT,
  username: SECRETS.DB_USERNAME,
  password: SECRETS.DB_PASSWORD,
  database: SECRETS.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
