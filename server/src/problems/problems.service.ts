import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Problem } from '../entities/problem.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import type { McqOption, McqOptionPublic } from '../types/mcq-option.interface';

@Injectable()
export class ProblemsService {
  constructor(
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(ProblemToExam)
    private readonly problemToExamRepo: Repository<ProblemToExam>,
  ) {}

  private shuffleAndStripOptions(options: McqOption[]): McqOptionPublic[] {
    const arr = options.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ isCorrect, ...opt }): McqOptionPublic => opt,
    );
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async listByExam(examId: number) {
    const mappings = await this.problemToExamRepo.find({
      where: { examId },
      order: { displayOrder: 'ASC' },
      relations: ['problem'],
    });
    return mappings.map((m) => {
      const p = m.problem;
      const mcqOptions =
        p.questionType === 'mcq' && p.mcqOptions
          ? this.shuffleAndStripOptions(p.mcqOptions)
          : null;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        maxScore: p.maxScore,
        starterCode: p.starterCode,
        displayOrder: m.displayOrder,
        questionType: p.questionType,
        isMultiSelect: p.isMultiSelect,
        questionImageData: p.questionImageData,
        mcqOptions,
      };
    });
  }

  async getById(id: number, examId?: number, stripSolution = true) {
    const problem = await this.problemRepo.findOne({
      where: { id },
      relations: ['testCases'],
    });
    if (!problem) throw new NotFoundException('Problem not found');

    if (examId !== undefined) {
      const mapping = await this.problemToExamRepo.findOne({
        where: { problemId: id, examId },
      });
      if (!mapping)
        throw new ForbiddenException(
          'Problem does not belong to the active exam',
        );
    }

    // Only return visible test cases to students
    problem.testCases = problem.testCases
      .filter((tc) => tc.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // Strip isCorrect from MCQ options and shuffle for students
    if (problem.questionType === 'mcq' && problem.mcqOptions) {
      // McqOptionPublic is a subset of McqOption (minus isCorrect).
      // We assign it back to the entity field before serialization to the client.
      Object.assign(problem, {
        mcqOptions: this.shuffleAndStripOptions(problem.mcqOptions),
      });
    }

    // Never expose reference solution to students
    if (stripSolution) {
      problem.referenceSolutionCode = null;
      problem.referenceSolutionLanguageId = null;
    }

    return problem;
  }

  async getByIdWithAllTestCases(id: number) {
    const problem = await this.problemRepo.findOne({
      where: { id },
      relations: ['testCases'],
    });
    if (!problem) throw new NotFoundException('Problem not found');

    problem.testCases.sort((a, b) => a.displayOrder - b.displayOrder);
    return problem;
  }
}
