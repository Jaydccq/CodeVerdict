import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { EnrollmentController } from './enrollment.controller';
import { ExamWindowGuard } from './guards/exam-window.guard';
import { Exam } from '../entities/exam.entity';
import { Problem } from '../entities/problem.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { ExamEnrollment } from '../entities/exam-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      Problem,
      ProblemToExam,
      Score,
      Submission,
      ExamEnrollment,
    ]),
  ],
  controllers: [ExamsController, EnrollmentController],
  providers: [ExamsService, ExamWindowGuard],
  exports: [ExamsService, ExamWindowGuard],
})
export class ExamsModule {}
