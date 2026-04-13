import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, MoreThan, QueryFailedError } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { Problem } from '../entities/problem.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { ExamEnrollment } from '../entities/exam-enrollment.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(ProblemToExam)
    private readonly problemToExamRepo: Repository<ProblemToExam>,
    @InjectRepository(Score)
    private readonly scoreRepo: Repository<Score>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(ExamEnrollment)
    private readonly enrollmentRepo: Repository<ExamEnrollment>,
  ) {}

  // Returns all active exams that have not yet ended (upcoming or in-progress).
  async getUpcomingExams(): Promise<Exam[]> {
    return this.examRepo.find({
      where: { isActive: true, endTime: MoreThan(new Date()) },
      order: { startTime: 'ASC' },
    });
  }

  async getById(id: number): Promise<Exam> {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async getStatus(examId: number) {
    const exam = await this.getById(examId);
    return {
      examId: exam.id,
      examEndTime: exam.endTime,
      serverTime: new Date(),
    };
  }

  async getMyProgress(userId: number, examId: number) {
    const exam = await this.getById(examId);

    const mappings = await this.problemToExamRepo.find({
      where: { examId: exam.id },
      relations: ['problem'],
    });

    const codingProblemIds = mappings
      .filter((m) => m.problem.questionType === 'coding')
      .map((m) => m.problemId);
    const mcqProblemIds = mappings
      .filter((m) => m.problem.questionType === 'mcq')
      .map((m) => m.problemId);
    const hasMcq = mcqProblemIds.length > 0;

    const [solvedScores, mcqSectionSubmitted] = await Promise.all([
      this.scoreRepo.find({
        where: { userId, examId: exam.id, firstSolvedAt: Not(IsNull()) },
        select: ['problemId'],
      }),
      hasMcq
        ? this.submissionRepo
            .createQueryBuilder('s')
            .where('s.userId = :userId', { userId })
            .andWhere('s.examId = :examId', { examId: exam.id })
            .andWhere('s.problemId IN (:...problemIds)', {
              problemIds: mcqProblemIds,
            })
            .getCount()
            .then((count) => count > 0)
        : Promise.resolve(false),
    ]);

    const solvedCodingIds = solvedScores
      .filter((s) => codingProblemIds.includes(s.problemId))
      .map((s) => s.problemId);

    // MCQ section counts as 1 unit; each coding problem is 1 unit
    const totalUnits = codingProblemIds.length + (hasMcq ? 1 : 0);
    const solvedUnits = solvedCodingIds.length + (mcqSectionSubmitted ? 1 : 0);

    return {
      examId: exam.id,
      totalProblems: totalUnits,
      solvedProblems: solvedUnits,
      allSolved: totalUnits > 0 && solvedUnits === totalUnits,
      solvedProblemIds: solvedCodingIds,
      mcqSectionSubmitted,
      mcqProblemCount: mcqProblemIds.length,
    };
  }

  async enroll(userId: number, examId: number): Promise<ExamEnrollment> {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    if (!exam.isActive) {
      throw new ForbiddenException('Exam is not open for enrollment');
    }

    if (exam.endTime < new Date()) {
      throw new BadRequestException('Exam has already ended');
    }

    const enrollment = this.enrollmentRepo.create({ userId, examId });
    try {
      return await this.enrollmentRepo.save(enrollment);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Already enrolled in this exam');
      }
      throw err;
    }
  }

  async isEnrolled(userId: number, examId: number): Promise<boolean> {
    const result = await this.enrollmentRepo.findOne({
      where: { userId, examId },
    });
    return !!result;
  }

  async getMyEnrollments(userId: number): Promise<ExamEnrollment[]> {
    return this.enrollmentRepo.find({
      where: { userId },
      relations: ['exam'],
    });
  }
}
