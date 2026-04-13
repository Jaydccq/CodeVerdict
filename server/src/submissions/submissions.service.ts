import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Submission } from '../entities/submission.entity';
import { Score } from '../entities/score.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { InputType } from '../entities/run-log.entity';
import { Judge0Service } from './judge0.service';
import { LANGUAGE_MAP } from '../config/constants';
import { ScoringService } from './scoring.service';
import { RunLogService } from './run-log.service';
import { ProblemsService } from '../problems/problems.service';
import { Exam } from '../entities/exam.entity';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(ProblemToExam)
    private readonly problemToExamRepo: Repository<ProblemToExam>,
    private readonly judge0Service: Judge0Service,
    private readonly scoringService: ScoringService,
    private readonly runLogService: RunLogService,
    private readonly problemsService: ProblemsService,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    userId: number,
    problemId: number,
    sourceCode: string,
    languageId: number,
    exam: Exam,
  ) {
    if (!this.judge0Service.isValidLanguageId(languageId)) {
      throw new BadRequestException(
        `Invalid languageId: ${languageId}. Supported: ${Object.entries(
          LANGUAGE_MAP,
        )
          .map(([k, v]) => `${k}=${v.join('|')}`)
          .join(', ')}`,
      );
    }

    // Block re-submission if already accepted
    const accepted = await this.submissionRepo.findOne({
      where: { userId, problemId, examId: exam.id, verdict: 'accepted' },
      select: ['id'],
    });
    if (accepted) {
      throw new BadRequestException({
        message:
          'You have already solved this problem. No further submissions are allowed.',
        code: 'ALREADY_SOLVED',
      });
    }

    const languageName =
      Object.keys(LANGUAGE_MAP).find((k) =>
        LANGUAGE_MAP[k].includes(languageId),
      ) || 'unknown';

    // Enforce the exam's allowed languages (allowedLanguages stores Judge0 IDs)
    if (!exam.allowedLanguages.includes(languageId)) {
      throw new ForbiddenException(
        `Language ID ${languageId} is not allowed for this exam.`,
      );
    }

    // Ensure the problem belongs to the active exam before loading test cases
    const submitMapping = await this.problemToExamRepo.findOne({
      where: { problemId, examId: exam.id },
    });
    if (!submitMapping) {
      throw new ForbiddenException(
        'Problem does not belong to the active exam',
      );
    }

    const problem =
      await this.problemsService.getByIdWithAllTestCases(problemId);

    if (problem.testCases.length === 0) {
      throw new BadRequestException(
        'This problem has no test cases configured',
      );
    }

    const results = await this.judge0Service.runBatch(
      sourceCode,
      languageId,
      problem.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      problem.timeLimitMs / 1000,
      problem.memoryLimitKb,
    );

    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === results.length;

    // Determine verdict
    let verdict = 'accepted';
    if (!allPassed) {
      const firstFail = results.find((r) => !r.passed);
      verdict = firstFail ? firstFail.status : 'wrong_answer';
    }

    const submission = this.submissionRepo.create({
      userId,
      problemId,
      examId: exam.id,
      code: sourceCode,
      language: languageName,
      languageId,
      testResults: results.map((r) => ({
        index: r.index,
        passed: r.passed,
        status: r.status,
        statusId: r.statusId,
        time: r.time,
        wallTime: r.wallTime,
        memory: r.memory,
        exitCode: r.exitCode,
      })),
      totalTestCases: results.length,
      passedTestCases: passedCount,
      verdict,
      score: 0,
    });

    // Wrap save + scoring + backfill in a single transaction
    const saved = await this.dataSource.transaction(async (manager) => {
      const savedSubmission = await manager
        .getRepository(Submission)
        .save(submission);

      const earnedScore = await this.scoringService.updateScore(
        userId,
        problemId,
        exam,
        savedSubmission.id,
        allPassed,
        problem.maxScore,
        manager,
      );

      if (earnedScore > 0) {
        await manager
          .getRepository(Submission)
          .update(savedSubmission.id, { score: earnedScore });
        savedSubmission.score = earnedScore;
      }

      return savedSubmission;
    });

    return saved;
  }

  async submitMcqSection(
    userId: number,
    examId: number,
    answers: Array<{ problemId: number; selectedOptionIds: string[] }>,
  ): Promise<{
    submitted: boolean;
    totalScore: number;
  }> {
    // 1. Load all MCQ problems for this exam
    const mappings = await this.problemToExamRepo.find({
      where: { examId },
      relations: ['problem'],
    });
    const mcqProblems = mappings
      .map((m) => m.problem)
      .filter((p) => p.questionType === 'mcq');

    if (mcqProblems.length === 0) {
      throw new BadRequestException('This exam has no MCQ problems');
    }

    // 2. All MCQ problems must have a corresponding answer
    const mcqProblemIds = new Set(mcqProblems.map((p) => p.id));
    const answeredIds = new Set(answers.map((a) => a.problemId));
    for (const pid of mcqProblemIds) {
      if (!answeredIds.has(pid)) {
        throw new BadRequestException(
          `You must answer all MCQ questions before submitting. Problem ${pid} is unanswered.`,
        );
      }
    }

    const validAnswers = answers.filter((a) => mcqProblemIds.has(a.problemId));

    // 3. One-shot: reject if any MCQ submission already exists for this user+exam
    const existingCount = await this.submissionRepo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.examId = :examId', { examId })
      .andWhere('s.problemId IN (:...problemIds)', {
        problemIds: [...mcqProblemIds],
      })
      .getCount();
    if (existingCount > 0) {
      throw new ConflictException('MCQ section already submitted');
    }

    // 4. Atomic transaction: create submissions + score records
    const submittedAt = new Date();
    const results = await this.dataSource.transaction(async (manager) => {
      const subRepo = manager.getRepository(Submission);
      const scoreRepo = manager.getRepository(Score);
      let totalScore = 0;

      for (const answer of validAnswers) {
        const problem = mcqProblems.find((p) => p.id === answer.problemId)!;
        const options = problem.mcqOptions ?? [];
        const validOptionIds = new Set(options.map((o) => o.id));

        for (const optId of answer.selectedOptionIds) {
          if (!validOptionIds.has(optId)) {
            throw new BadRequestException(
              `Invalid option ID: ${optId} for problem ${problem.id}`,
            );
          }
        }

        if (!problem.isMultiSelect && answer.selectedOptionIds.length !== 1) {
          throw new BadRequestException(
            `Problem ${problem.id} requires exactly one selected option`,
          );
        }

        const correctIds = new Set(
          options.filter((o) => o.isCorrect).map((o) => o.id),
        );
        const selected = answer.selectedOptionIds;
        const isCorrect =
          selected.length === correctIds.size &&
          selected.every((id) => correctIds.has(id));
        const verdict = isCorrect ? 'accepted' : 'wrong_answer';
        const earnedScore = isCorrect ? problem.maxScore : 0;

        const submission = await subRepo.save(
          subRepo.create({
            userId,
            problemId: problem.id,
            examId,
            code: null,
            language: null,
            languageId: null,
            selectedOptionIds: answer.selectedOptionIds,
            testResults: null,
            totalTestCases: null,
            passedTestCases: null,
            verdict,
            score: earnedScore,
            submittedAt,
          }),
        );

        let score = await scoreRepo.findOne({
          where: { userId, problemId: problem.id, examId },
        });
        if (!score) {
          score = scoreRepo.create({
            userId,
            problemId: problem.id,
            examId,
            totalAttempts: 1,
            wrongAttempts: 0,
            bestScore: earnedScore,
            firstSolvedAt: isCorrect ? submittedAt : null,
            bestSubmissionId: submission.id,
          });
        } else {
          score.totalAttempts += 1;
          score.bestScore = earnedScore;
          score.firstSolvedAt = isCorrect ? submittedAt : null;
          score.bestSubmissionId = submission.id;
        }
        await scoreRepo.save(score);

        totalScore += earnedScore;
      }

      return totalScore;
    });

    void this.scoringService.refreshLeaderboard().catch((err) => {
      this.logger.warn(
        `Leaderboard refresh failed after MCQ submit: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return { submitted: true, totalScore: results };
  }

  async run(
    userId: number,
    problemId: number,
    sourceCode: string,
    languageId: number,
    exam: Exam,
    customInput?: string,
  ) {
    if (!this.judge0Service.isValidLanguageId(languageId)) {
      throw new BadRequestException(
        `Invalid languageId: ${languageId}. Supported: ${Object.entries(
          LANGUAGE_MAP,
        )
          .map(([k, v]) => `${k}=${v.join('|')}`)
          .join(', ')}`,
      );
    }

    // Block run if already accepted (unless custom input)
    if (!customInput) {
      const accepted = await this.submissionRepo.findOne({
        where: { userId, problemId, examId: exam.id, verdict: 'accepted' },
        select: ['id'],
      });
      if (accepted) {
        throw new BadRequestException({
          message: 'You have already solved this problem.',
          code: 'ALREADY_SOLVED',
        });
      }
    }

    const languageName =
      Object.keys(LANGUAGE_MAP).find((k) =>
        LANGUAGE_MAP[k].includes(languageId),
      ) || 'unknown';

    // Enforce the exam's allowed languages (allowedLanguages stores Judge0 IDs)
    if (!exam.allowedLanguages.includes(languageId)) {
      throw new ForbiddenException(
        `Language ID ${languageId} is not allowed for this exam.`,
      );
    }

    // stripSolution=false so we keep referenceSolutionCode for generating expected output
    const problem = await this.problemsService.getById(
      problemId,
      undefined,
      false,
    );

    const runMapping = await this.problemToExamRepo.findOne({
      where: { problemId: problem.id, examId: exam.id },
    });
    if (!runMapping) {
      throw new ForbiddenException(
        'Problem does not belong to the active exam',
      );
    }

    // getById only returns visible test cases
    const sampleTCs = problem.testCases;
    const hasCustom =
      typeof customInput === 'string' && customInput.trim().length > 0;

    if (sampleTCs.length === 0 && !hasCustom) {
      return { results: [] };
    }

    const batch = [
      ...sampleTCs.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      ...(hasCustom ? [{ input: customInput, expectedOutput: '' }] : []),
    ];

    const hasRefSolution =
      hasCustom &&
      !!problem.referenceSolutionCode &&
      !!problem.referenceSolutionLanguageId;

    // Run student code and reference solution in parallel
    const [rawResults, refResult] = await Promise.all([
      this.judge0Service.runBatch(
        sourceCode,
        languageId,
        batch,
        problem.timeLimitMs / 1000,
        problem.memoryLimitKb,
      ),
      hasRefSolution
        ? this.judge0Service
            .runBatch(
              problem.referenceSolutionCode!,
              problem.referenceSolutionLanguageId!,
              [{ input: customInput, expectedOutput: '' }],
              problem.timeLimitMs / 1000,
              problem.memoryLimitKb,
            )
            .catch((err) => {
              this.logger.warn(
                `Reference solution Judge0 call failed for problem ${problemId}: ${err instanceof Error ? err.message : String(err)}`,
              );
              return null;
            })
        : Promise.resolve(null),
    ]);

    const sampleResults = rawResults.slice(0, sampleTCs.length).map((r, i) => ({
      index: r.index,
      passed: r.passed,
      status: r.status,
      stdout: r.stdout,
      stderr: r.stderr,
      compileOutput: r.compileOutput,
      time: r.time,
      memory: r.memory,
      expectedOutput: sampleTCs[i].expectedOutput,
      input: sampleTCs[i].input,
    }));

    let customResult:
      | {
          stdout: string | null;
          stderr: string | null;
          compileOutput: string | null;
          status: string;
          time: number | null;
          memory: number | null;
          expectedOutput: string | null;
          expectedOutputError: string | null;
        }
      | undefined;

    if (hasCustom) {
      const r = rawResults[rawResults.length - 1];
      const refOk = refResult?.[0]?.statusId === 3;
      customResult = {
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: r.compileOutput,
        status: r.status,
        time: r.time,
        memory: r.memory,
        expectedOutput: refOk ? (refResult?.[0].stdout ?? null) : null,
        expectedOutputError:
          !refOk && refResult?.[0]
            ? `Reference solution: ${refResult[0].status}`
            : null,
      };
    }

    // Fire-and-forget - run logging is non-critical
    void this.runLogService
      .save({
        userId,
        problemId,
        examId: exam.id,
        sourceCode,
        language: languageName,
        languageId,
        inputType: hasCustom ? InputType.CUSTOM : InputType.SAMPLE,
        customInput: hasCustom ? customInput : null,
        results: rawResults.map((r) => ({
          index: r.index,
          passed: r.passed,
          status: r.status,
          time: r.time,
          memory: r.memory,
        })),
      })
      .catch((err) => {
        this.logger.warn(
          `Run log save failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return {
      results: sampleResults,
      ...(customResult ? { customResult } : {}),
    };
  }

  async listByUser(userId: number, examId: number, problemId?: number) {
    const where: { userId: number; examId: number; problemId?: number } = {
      userId,
      examId,
    };
    if (problemId) where.problemId = problemId;

    return this.submissionRepo.find({
      where,
      order: { submittedAt: 'DESC' },
      select: [
        'id',
        'problemId',
        'language',
        'verdict',
        'passedTestCases',
        'totalTestCases',
        'score',
        'submittedAt',
      ],
    });
  }

  async getById(id: number, requestingUserId: number) {
    const submission = await this.submissionRepo.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.userId !== requestingUserId) {
      throw new ForbiddenException('Access denied');
    }
    return submission;
  }

  async count(): Promise<number> {
    return this.submissionRepo.count();
  }

  async findAllAdmin(
    examId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<Submission>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const search = pagination?.search?.trim();

    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'user')
      .leftJoinAndSelect('s.problem', 'problem')
      .leftJoinAndSelect('s.exam', 'exam')
      .orderBy('s.submittedAt', 'DESC');

    if (examId) {
      qb.andWhere('s.examId = :examId', { examId });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.rollNumber) LIKE :search OR LOWER(problem.title) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const [submissions, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: submissions, total, page, limit };
  }

  async getByIdAdmin(id: number) {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['user', 'problem', 'exam'],
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async deleteById(id: number): Promise<{ deleted: true }> {
    const submission = await this.submissionRepo.findOne({ where: { id } });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.submissionRepo.remove(submission);
    return { deleted: true };
  }
}
