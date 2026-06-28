import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';

const portFlagIndex = process.argv.indexOf('--port');
const port =
  portFlagIndex !== -1 && process.argv[portFlagIndex + 1]
    ? Number(process.argv[portFlagIndex + 1])
    : 2358;

function encode(value) {
  if (value === null || value === undefined) return null;
  return Buffer.from(String(value)).toString('base64');
}

function decode(value) {
  if (!value) return '';
  return Buffer.from(String(value), 'base64').toString('utf8');
}

function statusPayload(id, description) {
  return { id, description };
}

function buildResponse({
  sourceCode,
  languageId,
  stdin,
  stdout,
  stderr,
  compileOutput,
  message,
  statusId,
  statusDescription,
  timeSeconds,
  exitCode,
}) {
  const now = new Date().toISOString();
  return {
    token: randomUUID(),
    source_code: encode(sourceCode),
    language_id: languageId,
    stdin: encode(stdin),
    expected_output: null,
    stdout: encode(stdout),
    stderr: encode(stderr),
    compile_output: encode(compileOutput),
    message,
    exit_code: exitCode,
    exit_signal: null,
    status: statusPayload(statusId, statusDescription),
    created_at: now,
    finished_at: now,
    time: timeSeconds === null ? null : timeSeconds.toFixed(3),
    wall_time: timeSeconds === null ? null : timeSeconds.toFixed(3),
    memory: null,
  };
}

function inferCompileError(languageId, stderr) {
  if (!stderr) return false;
  if (languageId === 113) {
    return /SyntaxError|IndentationError/.test(stderr);
  }
  if (languageId === 102) {
    return /SyntaxError/.test(stderr);
  }
  return false;
}

function languageRuntime(languageId) {
  if (languageId === 113) {
    return { command: 'python3', extension: '.py' };
  }
  if (languageId === 102) {
    return { command: 'node', extension: '.js' };
  }
  return null;
}

async function executeSubmission(submission) {
  const sourceCode = decode(submission.source_code);
  const stdin = decode(submission.stdin);
  const languageId = Number(submission.language_id);
  const runtime = languageRuntime(languageId);
  const cpuTimeLimit = Math.max(
    1,
    Math.ceil(Number(submission.cpu_time_limit ?? 2) * 1000),
  );

  if (!runtime) {
    return buildResponse({
      sourceCode,
      languageId,
      stdin,
      stdout: null,
      stderr: 'Unsupported language for local mock Judge0',
      compileOutput: null,
      message: 'unsupported_language',
      statusId: 13,
      statusDescription: 'Internal Error',
      timeSeconds: null,
      exitCode: null,
    });
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cv-mock-judge0-'));
  const sourcePath = path.join(tempDir, `main${runtime.extension}`);
  await writeFile(sourcePath, sourceCode, 'utf8');

  const startedAt = performance.now();

  try {
    const result = await new Promise((resolve) => {
      const child = spawn(runtime.command, [sourcePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let finished = false;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, cpuTimeLimit);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: `${stderr}${error.message}`,
          exitCode: null,
          timedOut,
        });
      });

      child.on('close', (exitCode) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode,
          timedOut,
        });
      });

      child.stdin.end(stdin);
    });

    const timeSeconds = (performance.now() - startedAt) / 1000;

    if (result.timedOut) {
      return buildResponse({
        sourceCode,
        languageId,
        stdin,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: null,
        message: null,
        statusId: 5,
        statusDescription: 'Time Limit Exceeded',
        timeSeconds,
        exitCode: result.exitCode,
      });
    }

    if (result.exitCode === 0) {
      return buildResponse({
        sourceCode,
        languageId,
        stdin,
        stdout: result.stdout,
        stderr: null,
        compileOutput: null,
        message: null,
        statusId: 3,
        statusDescription: 'Accepted',
        timeSeconds,
        exitCode: 0,
      });
    }

    if (inferCompileError(languageId, result.stderr)) {
      return buildResponse({
        sourceCode,
        languageId,
        stdin,
        stdout: null,
        stderr: null,
        compileOutput: result.stderr,
        message: null,
        statusId: 6,
        statusDescription: 'Compilation Error',
        timeSeconds,
        exitCode: result.exitCode,
      });
    }

    return buildResponse({
      sourceCode,
      languageId,
      stdin,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: null,
      message: null,
      statusId: 11,
      statusDescription: 'Runtime Error (NZEC)',
      timeSeconds,
      exitCode: result.exitCode,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/languages') {
    return sendJson(res, 200, [
      { id: 113, name: 'Python (local mock)' },
      { id: 102, name: 'JavaScript (local mock)' },
    ]);
  }

  if (
    req.method === 'POST' &&
    req.url?.startsWith('/submissions/batch') &&
    req.url.includes('wait=true')
  ) {
    try {
      const body = await readJsonBody(req);
      const submissions = Array.isArray(body.submissions) ? body.submissions : [];
      const results = [];

      for (const submission of submissions) {
        results.push(await executeSubmission(submission));
      }

      return sendJson(res, 200, results);
    } catch (error) {
      return sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`mock-judge0-practice listening on http://127.0.0.1:${port}`);
});
