import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { LeaderboardService } from './leaderboard.service';
import { AdminGuard } from './guards/admin.guard';
import { SlackService } from '../common/slack.service';
import { Exam } from '../entities/exam.entity';
import { Problem } from '../entities/problem.entity';
import { TestCase } from '../entities/test-case.entity';
import { LeaderboardView } from '../entities/leaderboard-view.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { UsersModule } from '../users/users.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ProblemsModule } from '../problems/problems.module';
import { AuthModule } from '../auth/auth.module';
import { AutosaveModule } from '../autosave/autosave.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      Problem,
      TestCase,
      LeaderboardView,
      ProblemToExam,
    ]),
    UsersModule,
    SubmissionsModule,
    ProblemsModule,
    AuthModule,
    AutosaveModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, LeaderboardService, AdminGuard, SlackService],
})
export class AdminModule {}
