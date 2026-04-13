import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { SECRETS } from '../config/env';
import {
  JUDGE0_STATUS_MAP,
  TERMINAL_STATUS_IDS,
  VALID_LANGUAGE_IDS,
  POLL_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
} from '../config/constants';

export interface JudgeResult {
  index: number;
  passed: boolean;
  status: string;
  statusId: number;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  time: number | null;
  wallTime: number | null;
  memory: number | null;
  exitCode: number | null;
}

// Matches the actual Judge0 CE API submission response
// Docs: https://ce.judge0.com
interface Judge0SubmissionResponse {
  token: string;
  source_code: string | null;
  language_id: number;
  stdin: string | null;
  expected_output: string | null;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  exit_code: number | null;
  exit_signal: number | null;
  status: {
    id: number;
    description: string;
  } | null;
  created_at: string;
  finished_at: string | null;
  time: string | null;
  wall_time: string | null;
  memory: number | null;
}

// POST /submissions/batch returns array of tokens
interface Judge0BatchCreateResponse {
  token: string;
}

// GET /submissions/batch?tokens= returns
interface Judge0BatchGetResponse {
  submissions: Judge0SubmissionResponse[];
}

@Injectable()
export class Judge0Service {
  private readonly logger = new Logger(Judge0Service.name);
  private readonly baseUrl: string;
  private readonly rapidApiKey: string | undefined;
  private readonly rapidApiHost: string | undefined;

  constructor() {
    this.baseUrl = SECRETS.JUDGE0_URL;
    this.rapidApiKey = SECRETS.RAPIDAPI_KEY;
    this.rapidApiHost = SECRETS.RAPIDAPI_HOST;
  }

  private get rapidApiHeaders(): Record<string, string> {
    if (!this.rapidApiKey) return {};
    return {
      'x-rapidapi-key': this.rapidApiKey,
      'x-rapidapi-host': this.rapidApiHost!,
    };
  }

  isValidLanguageId(languageId: number): boolean {
    return VALID_LANGUAGE_IDS.has(languageId);
  }

  async runBatch(
    code: string,
    languageId: number,
    testCases: { input: string; expectedOutput: string }[],
    timeLimitSec = 2,
    memoryLimitKb = 262144,
  ): Promise<JudgeResult[]> {
    const submissions = testCases.map((tc) => ({
      source_code: this.toBase64(code),
      language_id: languageId,
      stdin: this.toBase64(tc.input),
      ...(tc.expectedOutput
        ? { expected_output: this.toBase64(tc.expectedOutput) }
        : {}),
      cpu_time_limit: timeLimitSec,
      memory_limit: memoryLimitKb,
    }));

    const batchSize = SECRETS.MAX_SUBMISSION_BATCH_SIZE;
    const chunks: (typeof submissions)[] = [];
    for (let i = 0; i < submissions.length; i += batchSize) {
      chunks.push(submissions.slice(i, i + batchSize));
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        this.submitChunk(
          chunk,
          languageId,
          testCases.length,
          timeLimitSec,
          memoryLimitKb,
        ),
      ),
    );

    // Flatten results preserving original order
    const allResults: JudgeResult[] = [];
    let globalIndex = 0;
    for (const results of chunkResults) {
      for (const result of results) {
        allResults.push({ ...result, index: globalIndex++ });
      }
    }
    return allResults;
  }

  private async submitChunk(
    submissions: Record<string, unknown>[],
    languageId: number,
    totalTestCases: number,
    timeLimitSec: number,
    memoryLimitKb: number,
  ): Promise<JudgeResult[]> {
    let results: Judge0SubmissionResponse[];

    try {
      const response = await axios.post<Judge0SubmissionResponse[]>(
        `${this.baseUrl}/submissions/batch?base64_encoded=true&wait=true`,
        { submissions },
        { timeout: 30000, headers: this.rapidApiHeaders },
      );

      results = response.data;
    } catch (err) {
      this.logAxiosError('batch submit', err, {
        languageId,
        testCaseCount: totalTestCases,
        chunkSize: submissions.length,
        timeLimitSec,
        memoryLimitKb,
      });
      throw new ServiceUnavailableException(
        'Code execution service is unavailable. Please try again later.',
      );
    }

    // wait=true returns full submission objects with status
    if (results[0] && results[0].status) {
      return this.parseResults(results);
    }

    // Fallback: if wait didn't work, poll using tokens
    const tokens = (results as Judge0BatchCreateResponse[]).map((t) => t.token);
    const polled = await this.pollUntilDone(tokens);
    return this.parseResults(polled);
  }

  private async pollUntilDone(
    tokens: string[],
  ): Promise<Judge0SubmissionResponse[]> {
    const tokenStr = tokens.join(',');

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      try {
        const response = await axios.get<Judge0BatchGetResponse>(
          `${this.baseUrl}/submissions/batch?tokens=${tokenStr}&base64_encoded=true`,
          { timeout: 10000, headers: this.rapidApiHeaders },
        );

        const subs = response.data.submissions;
        const allDone = subs.every(
          (s) => s.status !== null && TERMINAL_STATUS_IDS.has(s.status.id),
        );

        if (allDone) {
          return subs;
        }
      } catch (err) {
        this.logAxiosError(
          `poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}`,
          err,
          {
            tokens: tokenStr,
          },
        );
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    this.logger.error(
      `Judge0 polling exhausted after ${MAX_POLL_ATTEMPTS} attempts | tokens=${tokenStr}`,
    );
    throw new ServiceUnavailableException(
      'Code execution timed out. Please try again.',
    );
  }

  private parseResults(submissions: Judge0SubmissionResponse[]): JudgeResult[] {
    return submissions.map((sub, index) => {
      const statusId = sub.status ? sub.status.id : 13;
      const statusName = JUDGE0_STATUS_MAP[statusId] || 'internal_error';

      return {
        index,
        passed: statusId === 3,
        status: statusName,
        statusId,
        stdout: this.fromBase64(sub.stdout),
        stderr: this.fromBase64(sub.stderr),
        compileOutput: this.fromBase64(sub.compile_output),
        message: sub.message,
        time: sub.time ? parseFloat(sub.time) : null,
        wallTime: sub.wall_time ? parseFloat(sub.wall_time) : null,
        memory: sub.memory,
        exitCode: sub.exit_code,
      };
    });
  }

  private logAxiosError(
    operation: string,
    err: unknown,
    context?: Record<string, unknown>,
  ): void {
    const parts: string[] = [`Judge0 ${operation} failed`];

    if (axios.isAxiosError(err)) {
      parts.push(`status=${err.response?.status ?? 'no-response'}`);
      if (err.response?.data) {
        const body =
          typeof err.response.data === 'string'
            ? err.response.data
            : JSON.stringify(err.response.data);
        parts.push(`body=${body}`);
      }
      if (err.code) parts.push(`code=${err.code}`);
    } else {
      parts.push(err instanceof Error ? err.message : String(err));
    }

    if (context) {
      parts.push(`context=${JSON.stringify(context)}`);
    }

    this.logger.error(parts.join(' | '));
  }

  private toBase64(str: string): string {
    return Buffer.from(str || '').toString('base64');
  }

  private fromBase64(str: string | null): string | null {
    if (!str) return null;
    return Buffer.from(str, 'base64').toString('utf-8');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
