import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PracticeSubmission } from '../entities/practice-submission.entity';
import { Judge0Service, type JudgeResult } from '../submissions/judge0.service';
import { getPracticeLanguage, type PracticeLanguageKey } from './languages';
import { ProblemCatalogService } from './problem-catalog.service';
import type {
  PracticeProblem,
  PracticeProblemTestCase,
} from './problem-types';

export interface VisibleExecutionResult {
  index: number;
  passed: boolean;
  status: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
}

function normalizeOutput(output: string | null): string {
  return (output ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trimEnd();
}

function toPracticeVerdict(result: JudgeResult): string {
  if (result.status === 'accepted') return 'accepted';
  if (result.status === 'time_limit_exceeded') return 'time_limit_exceeded';
  if (result.status === 'compilation_error') return 'compile_error';
  if (result.status.startsWith('runtime_error')) return 'runtime_error';
  return result.status;
}

function buildVisibleResult(
  result: JudgeResult,
  testCase: PracticeProblemTestCase,
): VisibleExecutionResult {
  const status = toPracticeVerdict(result);
  const passed =
    status === 'accepted' &&
    normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput);

  return {
    index: result.index,
    passed,
    status: passed ? 'accepted' : status === 'accepted' ? 'wrong_answer' : status,
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    actualOutput: result.stdout,
    stderr: result.stderr,
    compileOutput: result.compileOutput,
    time: result.time,
    memory: result.memory,
  };
}

@Injectable()
export class PracticeService implements OnModuleInit {
  constructor(
    private readonly problems: ProblemCatalogService,
    private readonly judge0Service: Judge0Service,
    @InjectRepository(PracticeSubmission)
    private readonly practiceSubmissionRepo: Repository<PracticeSubmission>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS practice_submissions (
        id SERIAL PRIMARY KEY,
        "problemSlug" VARCHAR(255) NOT NULL,
        language VARCHAR(50) NOT NULL,
        "sourceCode" TEXT NOT NULL,
        verdict VARCHAR(50) NOT NULL,
        "passedCount" INTEGER NOT NULL,
        "totalCount" INTEGER NOT NULL,
        "safeDetailsJson" JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_submissions_problemSlug_createdAt"
      ON practice_submissions ("problemSlug", "createdAt")
    `);
  }

  listProblems() {
    return this.problems.list();
  }

  getProblem(slug: string) {
    const problem = this.problems.get(slug);
    return {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      samples: problem.samples,
      supportedLanguages: problem.languageConfigs,
      starterCode: problem.starterCode,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    };
  }

  private resolveProblemLanguage(problem: PracticeProblem, language: string) {
    if (!problem.supportedLanguages.includes(language as PracticeLanguageKey)) {
      throw new BadRequestException(
        `Language ${language} is not supported for problem ${problem.slug}`,
      );
    }

    const config = getPracticeLanguage(language);
    if (!config) {
      throw new BadRequestException(`Unknown language: ${language}`);
    }

    return config;
  }

  async runSample(slug: string, sourceCode: string, language: string) {
    const problem = this.problems.get(slug);
    const config = this.resolveProblemLanguage(problem, language);
    const results = await this.judge0Service.executeBatch(
      sourceCode,
      config.languageId,
      problem.visibleTests.map((test) => test.input),
      problem.timeLimitMs / 1000,
      problem.memoryLimitKb,
    );

    return {
      results: results.map((result, index) =>
        buildVisibleResult(result, problem.visibleTests[index]),
      ),
    };
  }

  async runCustom(
    slug: string,
    sourceCode: string,
    language: string,
    customInput: string,
  ) {
    const problem = this.problems.get(slug);
    const config = this.resolveProblemLanguage(problem, language);
    const result = await this.judge0Service.execute(
      sourceCode,
      config.languageId,
      customInput,
      problem.timeLimitMs / 1000,
      problem.memoryLimitKb,
    );

    return {
      status: toPracticeVerdict(result),
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      time: result.time,
      memory: result.memory,
    };
  }

  async submit(slug: string, sourceCode: string, language: string) {
    const problem = this.problems.get(slug);
    const config = this.resolveProblemLanguage(problem, language);
    const allTests = [...problem.visibleTests, ...problem.hiddenTests];
    const results = await this.judge0Service.executeBatch(
      sourceCode,
      config.languageId,
      allTests.map((test) => test.input),
      problem.timeLimitMs / 1000,
      problem.memoryLimitKb,
    );

    let passedCount = 0;
    let verdict = 'accepted';
    let failureType: string | null = null;
    let firstVisibleFailure: VisibleExecutionResult | null = null;
    let hiddenFailure = false;

    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const testCase = allTests[index];
      const status = toPracticeVerdict(result);
      const passed =
        status === 'accepted' &&
        normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput);

      if (passed) {
        passedCount += 1;
        continue;
      }

      verdict = status === 'accepted' ? 'wrong_answer' : status;
      failureType = verdict;

      if (testCase.visibility === 'visible' && !firstVisibleFailure) {
        firstVisibleFailure = buildVisibleResult(result, testCase);
      }
      if (testCase.visibility === 'hidden') {
        hiddenFailure = true;
      }
      break;
    }

    const safeDetailsJson: Record<string, unknown> =
      firstVisibleFailure !== null
        ? { kind: 'visible_failure', failure: firstVisibleFailure }
        : hiddenFailure
          ? {
              kind: 'hidden_failure',
              message: 'failed on hidden test',
              failureType,
            }
          : { kind: 'accepted' };

    const submission = await this.practiceSubmissionRepo.save(
      this.practiceSubmissionRepo.create({
        problemSlug: problem.slug,
        language,
        sourceCode,
        verdict,
        passedCount,
        totalCount: allTests.length,
        safeDetailsJson,
      }),
    );

    return {
      id: submission.id,
      verdict,
      passedCount,
      totalCount: allTests.length,
      failureType,
      visibleFailure: firstVisibleFailure,
      hiddenFailure:
        firstVisibleFailure === null && hiddenFailure
          ? {
              message: 'failed on hidden test',
              failureType,
            }
          : null,
      createdAt: submission.createdAt,
    };
  }

  async listSubmissions(slug: string) {
    this.problems.get(slug);

    const submissions = await this.practiceSubmissionRepo.find({
      where: { problemSlug: slug },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      problemSlug: submission.problemSlug,
      language: submission.language,
      verdict: submission.verdict,
      passedCount: submission.passedCount,
      totalCount: submission.totalCount,
      safeDetailsJson: submission.safeDetailsJson,
      createdAt: submission.createdAt,
    }));
  }
}
