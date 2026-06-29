import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PracticeSubmission } from '../entities/practice-submission.entity';
import { PracticeWorkspaceDraft } from '../entities/practice-workspace-draft.entity';
import { Judge0Service, type JudgeResult } from '../submissions/judge0.service';
import {
  runDebugWorkspaceScript,
  type DebugWorkspaceScriptResultItem,
} from './debug-workspace-runner';
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

function toProblemDetail(problem: PracticeProblem) {
  return {
    questionType: problem.questionType,
    source: problem.source,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    description: problem.description,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    editorial: problem.editorial,
    samples: problem.samples,
    supportedLanguages: problem.languageConfigs,
    starterCode: problem.starterCode,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitKb: problem.memoryLimitKb,
    debugWorkspace: problem.debugWorkspace
      ? {
          stack: problem.debugWorkspace.stack,
          runnerProfile: problem.debugWorkspace.runnerProfile,
          entryFiles: problem.debugWorkspace.entryFiles,
          editablePaths: problem.debugWorkspace.editablePaths,
          files: problem.debugWorkspace.files.map((file) => ({
            path: file.path,
            content: file.content,
            editable: file.editable,
          })),
        }
      : undefined,
  };
}

function toDebugVisibleResult(
  result: DebugWorkspaceScriptResultItem,
  index: number,
): VisibleExecutionResult {
  return {
    index,
    passed: result.passed,
    status: result.passed ? 'accepted' : 'wrong_answer',
    input: result.name,
    expectedOutput: 'PASS',
    actualOutput: result.passed ? 'PASS' : 'FAIL',
    stderr: result.message ?? null,
    compileOutput: null,
    time: null,
    memory: null,
  };
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
    @InjectRepository(PracticeWorkspaceDraft)
    private readonly practiceWorkspaceDraftRepo: Repository<PracticeWorkspaceDraft>,
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

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS practice_workspace_drafts (
        id SERIAL PRIMARY KEY,
        "problemSlug" VARCHAR(255) NOT NULL UNIQUE,
        "editedFilesJson" JSONB NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "IDX_practice_workspace_drafts_problemSlug"
      ON practice_workspace_drafts ("problemSlug")
    `);
  }

  listProblems() {
    return this.problems.list();
  }

  getProblem(slug: string) {
    const problem = this.problems.get(slug);
    return toProblemDetail(problem);
  }

  async saveEditorial(slug: string, editorial: string) {
    const problem = await this.problems.saveEditorial(slug, editorial);
    return toProblemDetail(problem);
  }

  async getDebugWorkspaceDraft(slug: string) {
    const problem = this.problems.get(slug);
    if (problem.questionType !== 'debug-workspace' || !problem.debugWorkspace) {
      throw new BadRequestException(
        `Problem ${problem.slug} is not a debug workspace problem.`,
      );
    }

    const draft = await this.practiceWorkspaceDraftRepo.findOne({
      where: { problemSlug: problem.slug },
    });

    return {
      editedFiles: (draft?.editedFilesJson ?? {}) as Record<string, string>,
      updatedAt: draft?.updatedAt?.toISOString() ?? null,
    };
  }

  async saveDebugWorkspaceDraft(
    slug: string,
    editedFiles: Record<string, string>,
  ) {
    const problem = this.problems.get(slug);
    if (problem.questionType !== 'debug-workspace' || !problem.debugWorkspace) {
      throw new BadRequestException(
        `Problem ${problem.slug} is not a debug workspace problem.`,
      );
    }

    const allowlist = new Set(problem.debugWorkspace.editablePaths);
    const normalizedEntries = Object.entries(editedFiles)
      .filter(([, content]) => typeof content === 'string')
      .filter(([filePath]) => allowlist.has(filePath))
      .sort(([left], [right]) => left.localeCompare(right));

    const normalizedEditedFiles = Object.fromEntries(normalizedEntries);

    const existing = await this.practiceWorkspaceDraftRepo.findOne({
      where: { problemSlug: problem.slug },
    });

    const draft = await this.practiceWorkspaceDraftRepo.save(
      this.practiceWorkspaceDraftRepo.create({
        id: existing?.id,
        problemSlug: problem.slug,
        editedFilesJson: normalizedEditedFiles,
      }),
    );

    return {
      editedFiles: draft.editedFilesJson as Record<string, string>,
      updatedAt: draft.updatedAt.toISOString(),
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
    if (problem.questionType === 'debug-workspace') {
      throw new BadRequestException(
        'Use the debug workspace run endpoint for this problem.',
      );
    }
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
    if (problem.questionType === 'debug-workspace') {
      throw new BadRequestException(
        'Custom stdin is not supported for debug-workspace problems.',
      );
    }
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
    if (problem.questionType === 'debug-workspace') {
      throw new BadRequestException(
        'Use the debug workspace submit endpoint for this problem.',
      );
    }
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

  async runDebugWorkspace(
    slug: string,
    editedFiles: Record<string, string>,
  ) {
    const problem = this.problems.get(slug);
    const results = await runDebugWorkspaceScript(problem, editedFiles, 'visible');
    return {
      results: results.results.map((result, index) =>
        toDebugVisibleResult(result, index),
      ),
    };
  }

  async submitDebugWorkspace(
    slug: string,
    editedFiles: Record<string, string>,
  ) {
    const problem = this.problems.get(slug);
    const results = await runDebugWorkspaceScript(problem, editedFiles, 'submit');

    let passedCount = 0;
    let verdict = 'accepted';
    let failureType: string | null = null;
    let firstVisibleFailure: VisibleExecutionResult | null = null;
    let hiddenFailure = false;
    let hiddenFailureMessage = 'failed on hidden test';

    for (let index = 0; index < results.results.length; index += 1) {
      const result = results.results[index];
      if (result.passed) {
        passedCount += 1;
        continue;
      }

      verdict = 'wrong_answer';
      failureType = verdict;

      if ((result.visibility ?? 'visible') === 'visible' && !firstVisibleFailure) {
        firstVisibleFailure = toDebugVisibleResult(result, index);
      }
      if ((result.visibility ?? 'visible') === 'hidden') {
        hiddenFailure = true;
        hiddenFailureMessage = result.message ?? hiddenFailureMessage;
      }
      break;
    }

    const safeDetailsJson: Record<string, unknown> =
      firstVisibleFailure !== null
        ? {
            kind: 'visible_failure',
            failure: firstVisibleFailure,
            editedPaths: Object.keys(editedFiles).sort(),
          }
        : hiddenFailure
          ? {
              kind: 'hidden_failure',
              message: hiddenFailureMessage,
              failureType,
              editedPaths: Object.keys(editedFiles).sort(),
            }
          : {
              kind: 'accepted',
              editedPaths: Object.keys(editedFiles).sort(),
            };

    const submission = await this.practiceSubmissionRepo.save(
      this.practiceSubmissionRepo.create({
        problemSlug: problem.slug,
        language: problem.debugWorkspace?.stack ?? 'workspace',
        sourceCode: JSON.stringify(editedFiles),
        verdict,
        passedCount,
        totalCount: results.results.length,
        safeDetailsJson,
      }),
    );

    return {
      id: submission.id,
      verdict,
      passedCount,
      totalCount: results.results.length,
      failureType,
      visibleFailure: firstVisibleFailure,
      hiddenFailure:
        firstVisibleFailure === null && hiddenFailure
          ? {
              message: hiddenFailureMessage,
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
