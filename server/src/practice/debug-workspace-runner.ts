import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BadRequestException } from '@nestjs/common';
import type { PracticeProblem } from './problem-types';

const execFileAsync = promisify(execFile);

export interface DebugWorkspaceScriptResultItem {
  name: string;
  passed: boolean;
  message?: string;
  visibility?: 'visible' | 'hidden';
}

export interface DebugWorkspaceScriptResult {
  results: DebugWorkspaceScriptResultItem[];
}

function isSafeRelativePath(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/).includes('..')
  );
}

function parseScriptOutput(stdout: string): DebugWorkspaceScriptResult {
  const parsed = JSON.parse(stdout) as { results?: unknown };
  if (!Array.isArray(parsed.results)) {
    throw new Error('debug workspace script must output JSON with results[]');
  }

  return {
    results: parsed.results.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error('invalid debug workspace result item');
      }
      const value = item as Record<string, unknown>;
      return {
        name: String(value.name ?? 'unnamed test'),
        passed: Boolean(value.passed),
        message:
          typeof value.message === 'string' ? value.message : undefined,
        visibility:
          value.visibility === 'hidden' ? 'hidden' : 'visible',
      };
    }),
  };
}

export async function runDebugWorkspaceScript(
  problem: PracticeProblem,
  editedFiles: Record<string, string>,
  mode: 'visible' | 'submit',
): Promise<DebugWorkspaceScriptResult> {
  if (problem.questionType !== 'debug-workspace' || !problem.debugWorkspace) {
    throw new BadRequestException(
      `Problem ${problem.slug} is not a debug workspace problem.`,
    );
  }

  const { debugWorkspace } = problem;
  const allowlist = new Set(debugWorkspace.editablePaths);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'codeverdict-debug-'));

  try {
    await cp(debugWorkspace.seedDir, tempDir, { recursive: true });

    for (const [relativePath, content] of Object.entries(editedFiles)) {
      if (!allowlist.has(relativePath) || !isSafeRelativePath(relativePath)) {
        throw new BadRequestException(
          `Edited file is not allowed: ${relativePath}`,
        );
      }

      await writeFile(path.join(tempDir, relativePath), content, 'utf8');
    }

    const script =
      mode === 'visible'
        ? debugWorkspace.manifest.visibleTestScript
        : debugWorkspace.manifest.submitTestScript;

    if (!isSafeRelativePath(script)) {
      throw new BadRequestException(`Invalid debug workspace script: ${script}`);
    }

    try {
      const { stdout } = await execFileAsync('node', [script], {
        cwd: tempDir,
        timeout: problem.timeLimitMs,
        maxBuffer: 1024 * 1024,
      });
      return parseScriptOutput(stdout);
    } catch (error) {
      const caught = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };

      const output = (caught.stdout ?? '').trim();
      if (output.startsWith('{')) {
        return parseScriptOutput(output);
      }

      const message =
        (caught.stderr ?? '').trim() ||
        output ||
        caught.message ||
        'Debug workspace execution failed.';

      return {
        results: [
          {
            name: mode === 'visible' ? 'visible tests' : 'submission tests',
            passed: false,
            message,
            visibility: mode === 'visible' ? 'visible' : 'hidden',
          },
        ],
      };
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
