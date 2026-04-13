import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { McqSectionController } from './mcq-section.controller';
import { Judge0Service } from './judge0.service';
import { ScoringService } from './scoring.service';
import { RunLogService } from './run-log.service';
import { SlackService } from '../common/slack.service';
import { Submission } from '../entities/submission.entity';
import { Score } from '../entities/score.entity';
import { RunLog } from '../entities/run-log.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { ProblemsModule } from '../problems/problems.module';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Score, RunLog, ProblemToExam]),
    ProblemsModule,
    ExamsModule,
  ],
  controllers: [SubmissionsController, McqSectionController],
  providers: [
    SubmissionsService,
    Judge0Service,
    ScoringService,
    RunLogService,
    SlackService,
  ],
  exports: [SubmissionsService, ScoringService, RunLogService],
})
export class SubmissionsModule {}
