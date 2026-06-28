import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExamsModule } from './exams/exams.module';
import { ProblemsModule } from './problems/problems.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AutosaveModule } from './autosave/autosave.module';
import { AdminModule } from './admin/admin.module';
import databaseConfig from './config/database.config';
import { PracticeModule } from './practice/practice.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig()),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ExamsModule,
    ProblemsModule,
    SubmissionsModule,
    PracticeModule,
    AutosaveModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
