import { Injectable } from '@nestjs/common';
import { LANGUAGE_MAP } from '../../src/submissions/judge0.service';
import type { JudgeResult } from '../../src/submissions/judge0.service';

const VALID_LANGUAGE_IDS = new Set(Object.values(LANGUAGE_MAP));

type ResponseMode =
  | 'all_passing'
  | 'all_failing'
  | 'compilation_error'
  | 'custom';

@Injectable()
export class MockJudge0Service {
  private mode: ResponseMode = 'all_passing';
  private customResults: JudgeResult[] = [];

  isValidLanguageId(languageId: number): boolean {
    return VALID_LANGUAGE_IDS.has(languageId);
  }

  setAllPassing(): void {
    this.mode = 'all_passing';
  }

  setAllFailing(): void {
    this.mode = 'all_failing';
  }

  setCompilationError(): void {
    this.mode = 'compilation_error';
  }

  setCustomResults(results: JudgeResult[]): void {
    this.mode = 'custom';
    this.customResults = results;
  }

  reset(): void {
    this.mode = 'all_passing';
    this.customResults = [];
  }

  async runBatch(
    _code: string,
    _languageId: number,
    testCases: { input: string; expectedOutput: string }[],
    _timeLimitSec?: number,
    _memoryLimitKb?: number,
  ): Promise<JudgeResult[]> {
    if (this.mode === 'custom') {
      return this.customResults;
    }

    return testCases.map((_, index) => {
      if (this.mode === 'compilation_error') {
        return {
          index,
          passed: false,
          status: 'compilation_error',
          statusId: 6,
          stdout: null,
          stderr: null,
          compileOutput: 'error: expected ; before } token',
          message: null,
          time: null,
          wallTime: null,
          memory: null,
          exitCode: null,
        };
      }

      if (this.mode === 'all_failing') {
        return {
          index,
          passed: false,
          status: 'wrong_answer',
          statusId: 4,
          stdout: 'wrong output',
          stderr: null,
          compileOutput: null,
          message: null,
          time: 0.01,
          wallTime: 0.02,
          memory: 9200,
          exitCode: 0,
        };
      }

      // all_passing
      return {
        index,
        passed: true,
        status: 'accepted',
        statusId: 3,
        stdout: 'correct output',
        stderr: null,
        compileOutput: null,
        message: null,
        time: 0.01,
        wallTime: 0.02,
        memory: 9200,
        exitCode: 0,
      };
    });
  }
}
