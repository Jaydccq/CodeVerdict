import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, In, EntityManager } from 'typeorm';
import { Exam } from '../entities/exam.entity';
import { Problem } from '../entities/problem.entity';
import { ProblemToExam } from '../entities/problem-to-exam.entity';
import { TestCase } from '../entities/test-case.entity';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { RunLog } from '../entities/run-log.entity';
import { ProblemView } from '../entities/problem-view.entity';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { ScoringService } from '../submissions/scoring.service';
import { RunLogService } from '../submissions/run-log.service';
import { ProblemViewService } from '../problems/problem-view.service';
import { UserRole } from '../common/enums/user-role.enum';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { CreateTestCaseStandaloneDto } from './dto/create-testcase.dto';
import { UpdateTestCaseStandaloneDto } from './dto/update-testcase.dto';
import { SECRETS } from '../config/env';
import type { McqOption } from '../types/mcq-option.interface';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepo: Repository<Exam>,
    @InjectRepository(Problem)
    private readonly problemRepo: Repository<Problem>,
    @InjectRepository(ProblemToExam)
    private readonly problemToExamRepo: Repository<ProblemToExam>,
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    private readonly usersService: UsersService,
    private readonly submissionsService: SubmissionsService,
    private readonly scoringService: ScoringService,
    private readonly runLogService: RunLogService,
    private readonly problemViewService: ProblemViewService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  private statsCache: {
    data: {
      totalExams: number;
      activeExams: { id: number; title: string }[];
      totalStudents: number;
      totalSubmissions: number;
    };
    expiresAt: number;
  } | null = null;
  private static STATS_TTL_MS = 30_000;

  // --- Stats ---

  async getStats() {
    if (this.statsCache && Date.now() < this.statsCache.expiresAt) {
      return this.statsCache.data;
    }

    const [totalExams, activeExamResults, totalStudents, totalSubmissions] =
      await Promise.all([
        this.examRepo.count(),
        this.examRepo.find({
          where: { isActive: true, endTime: MoreThan(new Date()) },
        }),
        this.usersService.count(true),
        this.submissionsService.count(),
      ]);

    const data = {
      totalExams,
      activeExams: activeExamResults.map((e) => ({
        id: e.id,
        title: e.title,
      })),
      totalStudents,
      totalSubmissions,
    };

    this.statsCache = {
      data,
      expiresAt: Date.now() + AdminService.STATS_TTL_MS,
    };
    return data;
  }

  // --- Exams CRUD ---

  async listExams(
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<Exam>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const [data, total] = await this.examRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getExam(id: number) {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');

    const mappings = await this.problemToExamRepo.find({
      where: { examId: id },
      order: { displayOrder: 'ASC' },
      relations: ['problem', 'problem.testCases'],
    });

    const problems = mappings.map((m) => ({
      ...m.problem,
      displayOrder: m.displayOrder,
    }));

    return { ...exam, problems };
  }

  async createExam(dto: CreateExamDto) {
    const exam = this.examRepo.create({
      title: dto.title,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      durationMinutes: dto.durationMinutes,
      allowedLanguages: dto.allowedLanguages,
      isActive: dto.isActive ?? false,
    });
    const savedExam = await this.examRepo.save(exam);

    if (dto.problemIds?.length) {
      const problems = await this.problemRepo.find({
        where: { id: In(dto.problemIds) },
      });
      if (problems.length !== dto.problemIds.length) {
        throw new NotFoundException('One or more problems not found');
      }
      const mappings = dto.problemIds.map((problemId, index) =>
        this.problemToExamRepo.create({
          problemId,
          examId: savedExam.id,
          displayOrder: index + 1,
        }),
      );
      await this.problemToExamRepo.save(mappings);
    }

    return savedExam;
  }

  async updateExam(id: number, dto: UpdateExamDto) {
    const exam = await this.getExam(id);

    if (dto.title !== undefined) exam.title = dto.title;
    if (dto.startTime !== undefined) exam.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) exam.endTime = new Date(dto.endTime);
    if (dto.durationMinutes !== undefined)
      exam.durationMinutes = dto.durationMinutes;
    if (dto.allowedLanguages !== undefined)
      exam.allowedLanguages = dto.allowedLanguages;
    if (dto.isActive !== undefined) exam.isActive = dto.isActive;

    return this.examRepo.save(exam);
  }

  async deleteExam(id: number) {
    const exam = await this.getExam(id);
    await this.examRepo.remove(exam);
    return { deleted: true };
  }

  async duplicateExam(
    id: number,
    newTitle: string,
    startTime: Date,
    endTime: Date,
  ) {
    if (!startTime || isNaN(startTime.getTime())) {
      throw new BadRequestException('startTime is required');
    }
    if (!endTime || isNaN(endTime.getTime())) {
      throw new BadRequestException('endTime is required');
    }

    const source = await this.getExam(id);

    return this.dataSource.transaction(async (manager) => {
      const newExam = manager.create(Exam, {
        title: newTitle,
        startTime,
        endTime,
        durationMinutes: source.durationMinutes,
        allowedLanguages: source.allowedLanguages,
        isActive: false,
      });
      const savedExam = await manager.save(newExam);

      for (const problem of source.problems ?? []) {
        const newMapping = manager.create(ProblemToExam, {
          problemId: problem.id,
          examId: savedExam.id,
          displayOrder: problem.displayOrder,
        });
        await manager.save(newMapping);
      }

      const result = await manager.findOne(Exam, {
        where: { id: savedExam.id },
      });
      const newMappings = await manager.find(ProblemToExam, {
        where: { examId: savedExam.id },
        order: { displayOrder: 'ASC' },
      });
      const newProblemIds = newMappings.map((m) => m.problemId);
      const newRawProblems = newProblemIds.length
        ? await manager.find(Problem, { where: { id: In(newProblemIds) } })
        : [];
      const problemsWithOrder = newMappings.map((m) => ({
        ...newRawProblems.find((p) => p.id === m.problemId)!,
        displayOrder: m.displayOrder,
      }));
      return { ...result!, problems: problemsWithOrder };
    });
  }

  async listExamProblems(
    examId: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<Problem & { displayOrder: number }>> {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const [mappings, total] = await this.problemToExamRepo.findAndCount({
      where: { examId },
      order: { displayOrder: 'ASC' },
      relations: ['problem', 'problem.testCases'],
      skip: (page - 1) * limit,
      take: limit,
    });
    const data: (Problem & { displayOrder: number })[] = mappings.map((m) => ({
      ...m.problem,
      displayOrder: m.displayOrder,
    }));
    return { data, total, page, limit };
  }

  // --- Problems CRUD ---

  // 5 MB expressed as max base64 string length (base64 inflates by 4/3)
  private static readonly IMAGE_MAX_BASE64 = Math.ceil(
    5 * 1024 * 1024 * (4 / 3),
  );

  private assertImageSize(base64: string, label: string): void {
    if (base64.length > AdminService.IMAGE_MAX_BASE64) {
      const actualMb = ((base64.length * 3) / 4 / 1024 / 1024).toFixed(1);
      throw new BadRequestException(
        `${label} exceeds the 5 MB limit (actual: ~${actualMb} MB). Please compress or resize the image.`,
      );
    }
  }

  private validateAndAssignMcqOptions(dto: {
    questionType?: string;
    isMultiSelect?: boolean;
    mcqOptions?: Array<{
      id?: string;
      text: string;
      imageData?: string;
      isCorrect: boolean;
    }>;
  }): McqOption[] | null {
    const type = dto.questionType ?? 'coding';

    if (type === 'coding') {
      if (dto.mcqOptions?.length) {
        throw new BadRequestException(
          'mcqOptions must be absent for coding problems',
        );
      }
      return null;
    }

    // MCQ validation
    const options = dto.mcqOptions ?? [];
    if (options.length < 2) {
      throw new BadRequestException('MCQ problems require at least 2 options');
    }

    const correctCount = options.filter((o) => o.isCorrect).length;
    if (!dto.isMultiSelect) {
      if (correctCount !== 1) {
        throw new BadRequestException(
          'Single-select MCQ must have exactly 1 correct option',
        );
      }
    } else {
      if (correctCount < 1) {
        throw new BadRequestException(
          'Multi-select MCQ must have at least 1 correct option',
        );
      }
    }

    options.forEach((opt, i) => {
      if (opt.imageData) {
        this.assertImageSize(opt.imageData, `Option ${i + 1} image`);
      }
    });

    return options.map(
      (opt): McqOption => ({ ...opt, id: opt.id ?? randomUUID() }),
    );
  }

  async getProblem(id: number) {
    const problem = await this.problemRepo.findOne({
      where: { id },
      relations: ['testCases'],
    });
    if (!problem) throw new NotFoundException('Problem not found');
    return problem;
  }

  async createProblem(dto: CreateProblemDto) {
    if (dto.examId) {
      const exam = await this.examRepo.findOne({ where: { id: dto.examId } });
      if (!exam) throw new NotFoundException('Exam not found');
    }

    if (dto.questionImageData) {
      this.assertImageSize(dto.questionImageData, 'Question image');
    }

    const assignedOptions = this.validateAndAssignMcqOptions(dto);

    try {
      const { testCases, examId, displayOrder, ...problemData } = dto;
      const updatedProblemData = {
        ...problemData,
        mcqOptions: assignedOptions,
      };
      const problem = this.problemRepo.create(updatedProblemData);
      const savedProblem = await this.problemRepo.save(problem);

      if (examId) {
        let order = displayOrder;
        if (order === undefined || order === null) {
          const maxMapping = await this.problemToExamRepo
            .createQueryBuilder('pte')
            .select('MAX(pte.displayOrder)', 'maxOrder')
            .where('pte.examId = :examId', { examId })
            .getRawOne<{ maxOrder: number | null }>();
          order = (maxMapping?.maxOrder ?? -1) + 1;
        }
        const mapping = this.problemToExamRepo.create({
          problemId: savedProblem.id,
          examId,
          displayOrder: order,
        });
        await this.problemToExamRepo.save(mapping);
      }

      if (testCases?.length) {
        const tcEntities = testCases.map((tc) =>
          this.testCaseRepo.create({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isVisible: tc.isVisible ?? false,
            displayOrder: tc.displayOrder,
            problemId: savedProblem.id,
          }),
        );
        await this.testCaseRepo.save(tcEntities);
      }

      return this.problemRepo.findOne({
        where: { id: savedProblem.id },
        relations: ['testCases'],
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as Error & { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'A problem with this displayOrder already exists for this exam',
        );
      }
      throw err;
    }
  }

  private async regradeAfterOptionsChange(
    manager: EntityManager,
    problemId: number,
    newOptions: McqOption[],
    maxScore: number,
  ): Promise<void> {
    const submissions = await manager.find(Submission, {
      where: { problemId },
      select: ['id', 'userId', 'examId', 'selectedOptionIds', 'submittedAt'],
    });

    const mcqSubs = submissions.filter(
      (s) => s.selectedOptionIds !== null && s.selectedOptionIds.length > 0,
    );
    if (!mcqSubs.length) return;

    const correctIds = new Set(
      newOptions.filter((o) => o.isCorrect).map((o) => o.id),
    );

    const scoreRepo = manager.getRepository(Score);
    for (const sub of mcqSubs) {
      const selected = sub.selectedOptionIds!;
      const isCorrect =
        selected.length === correctIds.size &&
        selected.every((sid) => correctIds.has(sid));
      const newVerdict = isCorrect ? 'accepted' : 'wrong_answer';
      const newScore = isCorrect ? maxScore : 0;

      await manager.update(Submission, sub.id, {
        verdict: newVerdict,
        score: newScore,
      });

      const score = await scoreRepo.findOne({
        where: { userId: sub.userId, problemId, examId: sub.examId },
      });
      if (score) {
        score.bestScore = newScore;
        score.firstSolvedAt = isCorrect ? sub.submittedAt : null;
        await scoreRepo.save(score);
      }
    }
  }

  async updateProblem(id: number, dto: UpdateProblemDto) {
    let shouldRefreshLeaderboard = false;

    const result = await this.dataSource.transaction(async (manager) => {
      const problem = await manager.findOne(Problem, {
        where: { id },
        relations: ['testCases'],
      });
      if (!problem) throw new NotFoundException('Problem not found');

      const { testCases, ...fields } = dto;

      if (fields.questionType !== undefined)
        problem.questionType = fields.questionType;
      if (fields.title !== undefined) problem.title = fields.title;
      if (fields.description !== undefined)
        problem.description = fields.description;
      if (fields.inputFormat !== undefined)
        problem.inputFormat = fields.inputFormat;
      if (fields.outputFormat !== undefined)
        problem.outputFormat = fields.outputFormat;
      if (fields.constraints !== undefined)
        problem.constraints = fields.constraints;
      if (fields.sampleInput !== undefined)
        problem.sampleInput = fields.sampleInput;
      if (fields.sampleOutput !== undefined)
        problem.sampleOutput = fields.sampleOutput;
      if (fields.difficulty !== undefined)
        problem.difficulty = fields.difficulty;
      if (fields.timeLimitMs !== undefined)
        problem.timeLimitMs = fields.timeLimitMs;
      if (fields.memoryLimitKb !== undefined)
        problem.memoryLimitKb = fields.memoryLimitKb;
      if (fields.maxScore !== undefined) problem.maxScore = fields.maxScore;
      if (fields.starterCode !== undefined)
        problem.starterCode = fields.starterCode ?? null;
      if (fields.referenceSolutionCode !== undefined)
        problem.referenceSolutionCode = fields.referenceSolutionCode ?? null;
      if (fields.referenceSolutionLanguageId !== undefined)
        problem.referenceSolutionLanguageId =
          fields.referenceSolutionLanguageId ?? null;
      if (fields.isMultiSelect !== undefined)
        problem.isMultiSelect = fields.isMultiSelect;
      if (fields.questionImageData !== undefined) {
        if (fields.questionImageData) {
          this.assertImageSize(fields.questionImageData, 'Question image');
        }
        problem.questionImageData = fields.questionImageData ?? null;
      }
      if (fields.mcqOptions !== undefined) {
        const assignedOptions = this.validateAndAssignMcqOptions({
          questionType: problem.questionType,
          isMultiSelect: fields.isMultiSelect ?? problem.isMultiSelect,
          mcqOptions: fields.mcqOptions,
        });
        problem.mcqOptions = assignedOptions;
      }

      await manager.save(problem);

      // Retroactively regrade existing MCQ submissions when options change
      if (
        fields.mcqOptions !== undefined &&
        problem.questionType === 'mcq' &&
        problem.mcqOptions
      ) {
        await this.regradeAfterOptionsChange(
          manager,
          id,
          problem.mcqOptions,
          problem.maxScore,
        );
        shouldRefreshLeaderboard = true;
      }

      if (fields.displayOrder !== undefined) {
        const mapping = await manager.findOne(ProblemToExam, {
          where: { problemId: id },
        });
        if (mapping) {
          mapping.displayOrder = fields.displayOrder;
          await manager.save(mapping);
        }
      }

      if (testCases !== undefined) {
        await manager.delete(TestCase, { problemId: id });
        if (testCases.length) {
          const tcEntities = testCases.map((tc) =>
            manager.create(TestCase, {
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isVisible: tc.isVisible ?? false,
              displayOrder: tc.displayOrder,
              problemId: id,
            }),
          );
          await manager.save(tcEntities);
        }
      }

      return manager.findOne(Problem, {
        where: { id },
        relations: ['testCases'],
      });
    });

    if (shouldRefreshLeaderboard) {
      void this.scoringService.refreshLeaderboard();
    }

    return result;
  }

  async deleteProblem(id: number) {
    const problem = await this.getProblem(id);
    await this.problemRepo.remove(problem);
    return { deleted: true };
  }

  async assignProblemToExam(
    problemId: number,
    examId: number,
    displayOrder: number,
  ) {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const problem = await this.problemRepo.findOne({
      where: { id: problemId },
      relations: ['testCases'],
    });
    if (!problem) throw new NotFoundException('Problem not found');

    try {
      let mapping = await this.problemToExamRepo.findOne({
        where: { problemId, examId },
      });
      if (mapping) {
        mapping.displayOrder = displayOrder;
      } else {
        mapping = this.problemToExamRepo.create({
          problemId,
          examId,
          displayOrder,
        });
      }
      await this.problemToExamRepo.save(mapping);
      return problem;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as Error & { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'A problem with this displayOrder already exists for this exam',
        );
      }
      throw err;
    }
  }

  async unassignProblemFromExam(problemId: number, examId: number) {
    const mapping = await this.problemToExamRepo.findOne({
      where: { problemId, examId },
    });
    if (!mapping)
      throw new NotFoundException('Problem is not assigned to this exam');
    await this.problemToExamRepo.remove(mapping);
    return { deleted: true };
  }

  // --- Admin Setup ---

  async adminSetup(email: string, setupKey: string) {
    const expectedKey = SECRETS.ADMIN_SETUP_KEY;
    if (!expectedKey || setupKey !== expectedKey) {
      throw new ForbiddenException('Invalid setup key');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    return this.usersService.updateRole(user.id, UserRole.ADMIN);
  }

  async adminRegister(dto: AdminRegisterDto) {
    const expectedKey = SECRETS.ADMIN_SETUP_KEY;
    if (!expectedKey || dto.setupKey !== expectedKey) {
      throw new ForbiddenException('Invalid setup key');
    }

    const user = await this.usersService.create({
      rollNumber: `ADMIN-${Date.now()}`,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    });

    await this.usersService.updateRole(user.id, UserRole.ADMIN);

    const token = this.jwtService.sign({ sub: user.id }, { expiresIn: '1d' });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        rollNumber: user.rollNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: UserRole.ADMIN,
      },
    };
  }

  // --- Cross-exam listing ---

  async listAllProblems(
    examId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<Problem>> {
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const search = pagination?.search?.trim();

    if (examId) {
      const qb = this.problemToExamRepo
        .createQueryBuilder('pte')
        .leftJoinAndSelect('pte.problem', 'problem')
        .leftJoinAndSelect('problem.testCases', 'testCases')
        .where('pte.examId = :examId', { examId })
        .orderBy('pte.displayOrder', 'ASC');

      if (search) {
        qb.andWhere('LOWER(problem.title) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
      }

      const [mappings, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const data: (Problem & { displayOrder: number })[] = mappings.map(
        (m) => ({
          ...m.problem,
          displayOrder: m.displayOrder,
        }),
      );
      return { data, total, page, limit };
    }

    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .leftJoinAndSelect('problem.testCases', 'testCases')
      .orderBy('problem.id', 'ASC');

    if (search) {
      qb.andWhere('LOWER(problem.title) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async listAllTestCases(
    problemId?: number,
    pagination?: PaginationDto,
  ): Promise<PaginatedResponse<TestCase>> {
    const where: Record<string, unknown> = {};
    if (problemId) where.problemId = problemId;
    const page = pagination?.page ?? 1;
    const limit = Math.min(pagination?.limit ?? 10, 100);
    const [data, total] = await this.testCaseRepo.findAndCount({
      where,
      relations: ['problem'],
      order: { problemId: 'ASC', displayOrder: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // --- Test Case standalone CRUD ---

  async getTestCase(id: number): Promise<TestCase> {
    const testCase = await this.testCaseRepo.findOne({
      where: { id },
      relations: ['problem'],
    });
    if (!testCase) throw new NotFoundException('Test case not found');
    return testCase;
  }

  async createTestCase(dto: CreateTestCaseStandaloneDto) {
    const problem = await this.problemRepo.findOne({
      where: { id: dto.problemId },
    });
    if (!problem) throw new NotFoundException('Problem not found');

    const testCase = this.testCaseRepo.create({
      problemId: dto.problemId,
      input: dto.input,
      expectedOutput: dto.expectedOutput,
      isVisible: dto.isVisible ?? false,
      displayOrder: dto.displayOrder ?? 0,
    });
    return this.testCaseRepo.save(testCase);
  }

  async updateTestCase(id: number, dto: UpdateTestCaseStandaloneDto) {
    const testCase = await this.testCaseRepo.findOne({ where: { id } });
    if (!testCase) throw new NotFoundException('Test case not found');

    if (dto.input !== undefined) testCase.input = dto.input;
    if (dto.expectedOutput !== undefined)
      testCase.expectedOutput = dto.expectedOutput;
    if (dto.isVisible !== undefined) testCase.isVisible = dto.isVisible;
    if (dto.displayOrder !== undefined)
      testCase.displayOrder = dto.displayOrder;

    return this.testCaseRepo.save(testCase);
  }

  async deleteTestCase(id: number) {
    const testCase = await this.testCaseRepo.findOne({ where: { id } });
    if (!testCase) throw new NotFoundException('Test case not found');
    await this.testCaseRepo.remove(testCase);
    return { deleted: true };
  }

  // --- Run Logs & Problem Views (delegated to sub-services) ---

  getRunLogs(
    filters: { examId?: number; problemId?: number; userId?: number },
    pagination?: PaginationDto,
  ) {
    return this.runLogService.findAll(filters, pagination);
  }

  getProblemViews(
    filters: { examId?: number; problemId?: number; userId?: number },
    pagination?: PaginationDto,
  ) {
    return this.problemViewService.findAll(filters, pagination);
  }

  // --- Problem Analytics ---

  async getProblemAnalytics(examId: number) {
    const pvRepo = this.dataSource.getRepository(ProblemView);
    const subRepo = this.dataSource.getRepository(Submission);
    const rlRepo = this.dataSource.getRepository(RunLog);

    const analyticsMappings = await this.problemToExamRepo.find({
      where: { examId },
      order: { displayOrder: 'ASC' },
      relations: ['problem'],
    });

    const [viewStats, submissionStats, runStats] = await Promise.all([
      pvRepo
        .createQueryBuilder('pv')
        .select('pv.problemId', 'problemId')
        .addSelect('COUNT(DISTINCT pv.userId)', 'uniqueViewers')
        .addSelect('SUM(pv.viewCount)', 'totalViews')
        .where('pv.examId = :examId', { examId })
        .groupBy('pv.problemId')
        .getRawMany<{
          problemId: string;
          uniqueViewers: string;
          totalViews: string;
        }>(),

      subRepo
        .createQueryBuilder('s')
        .select('s.problemId', 'problemId')
        .addSelect('COUNT(*)', 'totalSubmissions')
        .addSelect('COUNT(DISTINCT s.userId)', 'uniqueAttemptors')
        .addSelect(
          `SUM(CASE WHEN s.verdict = 'accepted' THEN 1 ELSE 0 END)`,
          'acceptedCount',
        )
        .addSelect(
          `COUNT(DISTINCT CASE WHEN s.verdict = 'accepted' THEN s.userId ELSE NULL END)`,
          'uniqueSolvers',
        )
        .where('s.examId = :examId', { examId })
        .groupBy('s.problemId')
        .getRawMany<{
          problemId: string;
          totalSubmissions: string;
          uniqueAttemptors: string;
          acceptedCount: string;
          uniqueSolvers: string;
        }>(),

      rlRepo
        .createQueryBuilder('rl')
        .select('rl.problemId', 'problemId')
        .addSelect('COUNT(*)', 'totalRuns')
        .addSelect('COUNT(DISTINCT rl.userId)', 'uniqueRunners')
        .where('rl.examId = :examId', { examId })
        .groupBy('rl.problemId')
        .getRawMany<{
          problemId: string;
          totalRuns: string;
          uniqueRunners: string;
        }>(),
    ]);

    const viewMap = new Map(viewStats.map((r) => [Number(r.problemId), r]));
    const subMap = new Map(
      submissionStats.map((r) => [Number(r.problemId), r]),
    );
    const runMap = new Map(runStats.map((r) => [Number(r.problemId), r]));

    return analyticsMappings.map((m) => ({
      problemId: m.problem.id,
      title: m.problem.title,
      displayOrder: m.displayOrder,
      views: {
        uniqueViewers: parseInt(
          viewMap.get(m.problem.id)?.uniqueViewers ?? '0',
          10,
        ),
        totalViews: parseInt(viewMap.get(m.problem.id)?.totalViews ?? '0', 10),
      },
      submissions: {
        totalSubmissions: parseInt(
          subMap.get(m.problem.id)?.totalSubmissions ?? '0',
          10,
        ),
        uniqueAttemptors: parseInt(
          subMap.get(m.problem.id)?.uniqueAttemptors ?? '0',
          10,
        ),
        acceptedCount: parseInt(
          subMap.get(m.problem.id)?.acceptedCount ?? '0',
          10,
        ),
        uniqueSolvers: parseInt(
          subMap.get(m.problem.id)?.uniqueSolvers ?? '0',
          10,
        ),
      },
      runs: {
        totalRuns: parseInt(runMap.get(m.problem.id)?.totalRuns ?? '0', 10),
        uniqueRunners: parseInt(
          runMap.get(m.problem.id)?.uniqueRunners ?? '0',
          10,
        ),
      },
    }));
  }

  // --- User Exam Detail (leaderboard drill-down) ---

  async getUserExamDetail(userId: number, examId: number) {
    const scoreRepo = this.dataSource.getRepository(Score);
    const submissionRepo = this.dataSource.getRepository(Submission);

    const [user, exam, scores, submissions, runLogs, problemViews, problems] =
      await Promise.all([
        this.usersService.findByIdOrFail(userId),

        this.examRepo.findOne({ where: { id: examId } }),

        scoreRepo.find({ where: { userId, examId } }),

        submissionRepo.find({
          where: { userId, examId },
          select: {
            id: true,
            problemId: true,
            language: true,
            languageId: true,
            verdict: true,
            score: true,
            passedTestCases: true,
            totalTestCases: true,
            testResults: true,
            submittedAt: true,
            code: true,
            selectedOptionIds: true,
          },
          order: { submittedAt: 'DESC' },
        }),

        this.runLogService
          .findAll({ userId, examId }, { page: 1, limit: 500 })
          .then((r: PaginatedResponse<RunLog>) => r.data),

        this.problemViewService
          .findAll({ userId, examId }, { page: 1, limit: 500 })
          .then((r: PaginatedResponse<ProblemView>) => r.data),

        this.problemToExamRepo
          .find({
            where: { examId },
            order: { displayOrder: 'ASC' },
            relations: ['problem'],
          })
          .then((maps) =>
            maps.map((m) => ({
              id: m.problem.id,
              title: m.problem.title,
              maxScore: m.problem.maxScore,
              displayOrder: m.displayOrder,
              questionType: m.problem.questionType,
              mcqOptions: m.problem.mcqOptions,
            })),
          ),
      ]);

    if (!exam) throw new NotFoundException('Exam not found');

    const totalProblems = problems.length;
    const solved = scores.filter((s) => s.firstSolvedAt !== null).length;
    const attempted = scores.filter((s) => s.totalAttempts > 0).length;

    return {
      user: {
        id: user.id,
        rollNumber: user.rollNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      exam: { id: exam.id, title: exam.title },
      problems,
      scores,
      submissions,
      runLogs,
      problemViews,
      summary: {
        totalProblems,
        solved,
        attempted,
        neverAttempted: totalProblems - attempted,
      },
    };
  }
}
