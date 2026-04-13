import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { ProblemViewService } from './problem-view.service';
import { Problem } from '../entities/problem.entity';
import { ProblemView } from '../entities/problem-view.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Problem, ProblemView, ProblemToExam]),
    ExamsModule,
  ],
  controllers: [ProblemsController],
  providers: [ProblemsService, ProblemViewService],
  exports: [ProblemsService, ProblemViewService],
})
export class ProblemsModule {}
