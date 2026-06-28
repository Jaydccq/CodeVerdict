import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeSubmission } from '../entities/practice-submission.entity';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ProblemCatalogService } from './problem-catalog.service';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [SubmissionsModule, TypeOrmModule.forFeature([PracticeSubmission])],
  controllers: [PracticeController],
  providers: [ProblemCatalogService, PracticeService],
})
export class PracticeModule {}
