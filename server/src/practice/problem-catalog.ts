import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  PRACTICE_LANGUAGE_KEYS,
  PRACTICE_LANGUAGES,
  type PracticeLanguageKey,
} from './languages';
import { parseProblemYaml } from './problem-parser';
import type {
  PracticeDebugWorkspace,
  PracticeDebugWorkspaceFile,
  PracticeDebugWorkspaceManifest,
  PracticeProblem,
  PracticeProblemListItem,
  PracticeProblemMetadata,
  PracticeQuestionType,
  PracticeProblemSample,
  PracticeProblemTestCase,
} from './problem-types';

interface CatalogResult {
  problems: PracticeProblem[];
  problemsDir: string;
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(
  value: unknown,
  field: string,
  errors: string[],
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty string`);
    return '';
  }
  return value;
}

function asPositiveInt(
  value: unknown,
  field: string,
  errors: string[],
): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    errors.push(`${field} must be a positive integer`);
    return 0;
  }
  return value as number;
}

function normalizeDescriptionSummary(description: string): string {
  const firstLine = description
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine ?? '';
}

function normalizeFixtureText(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd();
}

export function hasUnresolvedPlaceholder(value: string): boolean {
  return ['未提供', '未公开', '不伪造官方答案'].some((placeholder) =>
    value.includes(placeholder),
  );
}

function resolveProblemsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'problems'),
    path.join(process.cwd(), '..', 'problems'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error('Could not find a problems/ directory from the current cwd');
}

function readTestCases(
  problemDir: string,
  visibility: 'visible' | 'hidden',
  errors: string[],
): PracticeProblemTestCase[] {
  const testsDir = path.join(problemDir, 'tests', visibility);
  if (!existsSync(testsDir) || !statSync(testsDir).isDirectory()) {
    errors.push(`tests/${visibility} directory is missing`);
    return [];
  }

  const files = readdirSync(testsDir).sort();
  const inputs = files.filter((file) => file.endsWith('.in'));
  const outputs = new Set(files.filter((file) => file.endsWith('.out')));

  for (const outputFile of outputs) {
    const inputFile = `${outputFile.slice(0, -4)}.in`;
    if (!files.includes(inputFile)) {
      errors.push(`Missing input file for tests/${visibility}/${outputFile}`);
    }
  }

  return inputs.map((inputFile) => {
    const id = inputFile.slice(0, -3);
    const outputFile = `${id}.out`;
    if (!outputs.has(outputFile)) {
      errors.push(`Missing output file for tests/${visibility}/${inputFile}`);
      return {
        id,
        input: '',
        expectedOutput: '',
        visibility,
      };
    }

    return {
      id,
      input: normalizeFixtureText(
        readFileSync(path.join(testsDir, inputFile), 'utf8'),
      ),
      expectedOutput: normalizeFixtureText(
        readFileSync(path.join(testsDir, outputFile), 'utf8'),
      ),
      visibility,
    };
  });
}

function readStarterCode(
  problemDir: string,
  supportedLanguages: PracticeLanguageKey[],
  errors: string[],
): Record<PracticeLanguageKey, string> {
  const starterDir = path.join(problemDir, 'starter-code');
  const starterCode = {} as Record<PracticeLanguageKey, string>;

  for (const key of supportedLanguages) {
    const fileName = PRACTICE_LANGUAGES[key].starterFile;
    const filePath = path.join(starterDir, fileName);
    if (!existsSync(filePath)) {
      errors.push(`Missing starter-code/${fileName}`);
      continue;
    }
    starterCode[key] = readFileSync(filePath, 'utf8');
  }

  return starterCode;
}

function isSafeRelativePath(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/).includes('..')
  );
}

function readWorkspaceFiles(
  baseDir: string,
  currentDir = baseDir,
): PracticeDebugWorkspaceFile[] {
  return readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        return readWorkspaceFiles(baseDir, absolutePath);
      }

      return [
        {
          path: path.relative(baseDir, absolutePath).replaceAll(path.sep, '/'),
          content: readFileSync(absolutePath, 'utf8'),
          editable: false,
        },
      ];
    });
}

function selectVisibleWorkspaceFiles(
  files: PracticeDebugWorkspaceFile[],
  entryFiles: string[],
  editablePaths: string[],
): PracticeDebugWorkspaceFile[] {
  const visiblePaths = new Set([...entryFiles, ...editablePaths]);
  return files.filter((file) => visiblePaths.has(file.path));
}

function readDebugWorkspace(
  problemDir: string,
  errors: string[],
): PracticeDebugWorkspace | undefined {
  const workspaceDir = path.join(problemDir, 'workspace');
  const manifestPath = path.join(workspaceDir, 'manifest.json');
  const seedDir = path.join(workspaceDir, 'seed');

  if (!existsSync(workspaceDir) || !statSync(workspaceDir).isDirectory()) {
    errors.push('workspace directory is required for debug-workspace problems');
    return undefined;
  }

  if (!existsSync(manifestPath)) {
    errors.push('workspace/manifest.json is required');
    return undefined;
  }

  if (!existsSync(seedDir) || !statSync(seedDir).isDirectory()) {
    errors.push('workspace/seed directory is required');
    return undefined;
  }

  let manifestRaw: Record<string, unknown>;
  try {
    manifestRaw = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    errors.push('workspace/manifest.json must be valid JSON');
    return undefined;
  }

  const entryFiles = Array.isArray(manifestRaw.entryFiles)
    ? manifestRaw.entryFiles.filter(
        (value): value is string =>
          typeof value === 'string' && isSafeRelativePath(value),
      )
    : [];
  const editablePaths = Array.isArray(manifestRaw.editablePaths)
    ? manifestRaw.editablePaths.filter(
        (value): value is string =>
          typeof value === 'string' && isSafeRelativePath(value),
      )
    : [];
  const visibleTestScript =
    typeof manifestRaw.visibleTestScript === 'string'
      ? manifestRaw.visibleTestScript
      : '';
  const submitTestScript =
    typeof manifestRaw.submitTestScript === 'string'
      ? manifestRaw.submitTestScript
      : '';
  const stack = manifestRaw.stack;

  if (stack !== 'node') errors.push('workspace manifest stack must be "node"');
  if (entryFiles.length === 0) errors.push('workspace entryFiles must be non-empty');
  if (editablePaths.length === 0) {
    errors.push('workspace editablePaths must be non-empty');
  }
  if (!isSafeRelativePath(visibleTestScript)) {
    errors.push('workspace visibleTestScript must be a safe relative path');
  }
  if (!isSafeRelativePath(submitTestScript)) {
    errors.push('workspace submitTestScript must be a safe relative path');
  }

  const files = readWorkspaceFiles(seedDir);
  const fileSet = new Set(files.map((file) => file.path));

  for (const entryFile of entryFiles) {
    if (!fileSet.has(entryFile)) {
      errors.push(`workspace entry file does not exist in seed: ${entryFile}`);
    }
  }

  for (const editablePath of editablePaths) {
    if (!fileSet.has(editablePath)) {
      errors.push(
        `workspace editable file does not exist in seed: ${editablePath}`,
      );
    }
  }

  if (!fileSet.has(visibleTestScript)) {
    errors.push(
      `workspace visible test script does not exist in seed: ${visibleTestScript}`,
    );
  }
  if (!fileSet.has(submitTestScript)) {
    errors.push(
      `workspace submit test script does not exist in seed: ${submitTestScript}`,
    );
  }

  const editablePathSet = new Set(editablePaths);
  const visibleFiles = selectVisibleWorkspaceFiles(files, entryFiles, editablePaths);
  const normalizedFiles = visibleFiles.map((file) => ({
    ...file,
    editable: editablePathSet.has(file.path),
  }));

  const manifest: PracticeDebugWorkspaceManifest = {
    stack: 'node',
    runnerProfile:
      typeof manifestRaw.runnerProfile === 'string'
        ? manifestRaw.runnerProfile
        : 'node-script',
    entryFiles,
    editablePaths,
    visibleTestScript,
    submitTestScript,
  };

  return {
    stack: 'node',
    runnerProfile: manifest.runnerProfile ?? 'node-script',
    entryFiles,
    editablePaths,
    files: normalizedFiles,
    manifest,
    seedDir,
  };
}

function readEditorial(
  problemDir: string,
  requireEditorial: boolean,
  errors: string[],
): string | undefined {
  const editorialFile = path.join(problemDir, 'editorial.md');
  if (!existsSync(editorialFile)) {
    if (requireEditorial) errors.push('editorial.md is required');
    return undefined;
  }

  const editorial = readFileSync(editorialFile, 'utf8').trimEnd();
  if (requireEditorial && editorial.trim() === '') {
    errors.push('editorial.md must be non-empty');
  }
  return editorial;
}

function validateSamples(
  samples: PracticeProblemSample[],
  visibleTests: PracticeProblemTestCase[],
  errors: string[],
): void {
  if (samples.length === 0) {
    errors.push('samples must contain at least one example');
    return;
  }

  for (const sample of samples) {
    const match = visibleTests.find(
      (test) =>
        test.input === normalizeFixtureText(sample.input) &&
        test.expectedOutput === normalizeFixtureText(sample.output),
    );
    if (!match) {
      errors.push('each sample must match a visible test input/output pair');
      return;
    }
  }
}

function parseProblemMetadata(
  raw: Record<string, unknown>,
  slug: string,
  errors: string[],
): PracticeProblemMetadata {
  const supportedLanguagesRaw = raw.supportedLanguages;
  const samplesRaw = raw.samples;

  const supportedLanguages = Array.isArray(supportedLanguagesRaw)
    ? supportedLanguagesRaw.filter((value): value is PracticeLanguageKey =>
        typeof value === 'string' &&
        PRACTICE_LANGUAGE_KEYS.includes(value as PracticeLanguageKey),
      )
    : [];

  if (!Array.isArray(supportedLanguagesRaw) || supportedLanguages.length === 0) {
    errors.push(
      'supportedLanguages must be a non-empty array of known language keys',
    );
  }

  if (
    Array.isArray(supportedLanguagesRaw) &&
    supportedLanguages.length !== supportedLanguagesRaw.length
  ) {
    errors.push('supportedLanguages contains unknown language keys');
  }

  const samples: PracticeProblemSample[] = Array.isArray(samplesRaw)
    ? samplesRaw
        .filter((item): item is Record<string, unknown> => isPlainObject(item))
        .map((item) => ({
          input: asString(item.input, 'samples[].input', errors),
          output: asString(item.output, 'samples[].output', errors),
          explanation:
            typeof item.explanation === 'string' ? item.explanation : undefined,
        }))
    : [];

  if (!Array.isArray(samplesRaw)) {
    errors.push('samples must be an array');
  }

  const difficulty = asString(raw.difficulty, 'difficulty', errors);
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('difficulty must be one of: easy, medium, hard');
  }

  const questionTypeRaw = raw.questionType;
  const questionType: PracticeQuestionType =
    questionTypeRaw === 'debug-workspace' ? 'debug-workspace' : 'algorithm';
  if (
    questionTypeRaw !== undefined &&
    questionTypeRaw !== 'debug-workspace'
  ) {
    errors.push('questionType must be "debug-workspace" when provided');
  }

  return {
    slug,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    questionType,
    title: asString(raw.title, 'title', errors),
    difficulty: (difficulty as PracticeProblemMetadata['difficulty']) || 'easy',
    description: asString(raw.description, 'description', errors),
    inputFormat: asString(raw.inputFormat, 'inputFormat', errors),
    outputFormat: asString(raw.outputFormat, 'outputFormat', errors),
    constraints: asString(raw.constraints, 'constraints', errors),
    samples,
    supportedLanguages,
    timeLimitMs: asPositiveInt(raw.timeLimitMs, 'timeLimitMs', errors),
    memoryLimitKb: asPositiveInt(raw.memoryLimitKb, 'memoryLimitKb', errors),
  };
}

function loadProblem(problemDir: string): PracticeProblem {
  const errors: string[] = [];
  const slug = path.basename(problemDir);
  const metadataFile = path.join(problemDir, 'problem.yaml');

  if (!existsSync(metadataFile)) {
    throw new Error(`Problem ${slug} is missing problem.yaml`);
  }

  const parsed = parseProblemYaml(readFileSync(metadataFile, 'utf8'));
  const metadata = parseProblemMetadata(parsed, slug, errors);
  const isAmazonOaProblem = metadata.source === 'amazon-oa';
  const isDebugWorkspace = metadata.questionType === 'debug-workspace';
  const isAmazonDebugProblem =
    isAmazonOaProblem && slug.startsWith('amazon-debug-');

  if ((parsed.slug ?? slug) !== slug) {
    errors.push('slug must match the directory name');
  }

  if (isAmazonDebugProblem && !isDebugWorkspace) {
    errors.push(
      'amazon-debug-* amazon-oa problems must use questionType: debug-workspace',
    );
  }

  const visibleTests = isDebugWorkspace
    ? []
    : readTestCases(problemDir, 'visible', errors);
  const hiddenTests = isDebugWorkspace
    ? []
    : readTestCases(problemDir, 'hidden', errors);

  if (!isDebugWorkspace) {
    if (visibleTests.length === 0) {
      errors.push('at least one visible test is required');
    }
    if (hiddenTests.length === 0) {
      errors.push('at least one hidden test is required');
    }

    validateSamples(metadata.samples, visibleTests, errors);
  }

  const starterCode = isDebugWorkspace
    ? ({} as Record<PracticeLanguageKey, string>)
    : readStarterCode(problemDir, metadata.supportedLanguages, errors);
  const editorial = readEditorial(problemDir, isAmazonOaProblem, errors);
  const debugWorkspace = isDebugWorkspace
    ? readDebugWorkspace(problemDir, errors)
    : undefined;

  if (isAmazonOaProblem) {
    const judgeFacingFields = [
      metadata.title,
      metadata.description,
      metadata.inputFormat,
      metadata.outputFormat,
      metadata.constraints,
      ...metadata.samples.flatMap((sample) => [
        sample.input,
        sample.output,
        sample.explanation ?? '',
      ]),
      editorial ?? '',
    ];

    if (judgeFacingFields.some(hasUnresolvedPlaceholder)) {
      errors.push(
        'amazon-oa problem content contains unresolved source placeholders',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Problem ${slug} is invalid:\n${errors.map((err) => `- ${err}`).join('\n')}`,
    );
  }

  return {
    ...metadata,
    editorial,
    starterCode,
    languageConfigs: metadata.supportedLanguages.map(
      (language) => PRACTICE_LANGUAGES[language],
    ),
    visibleTests,
    hiddenTests,
    debugWorkspace,
  };
}

export function loadPracticeCatalog(): CatalogResult {
  const problemsDir = resolveProblemsDir();
  const problems = readdirSync(problemsDir)
    .map((entry) => path.join(problemsDir, entry))
    .filter((entry) => statSync(entry).isDirectory())
    .map((entry) => loadProblem(entry))
    .sort((left, right) => left.title.localeCompare(right.title));

  if (problems.length === 0) {
    throw new Error('No practice problems were found under problems/');
  }

  const slugSet = new Set<string>();
  for (const problem of problems) {
    if (slugSet.has(problem.slug)) {
      throw new Error(`Duplicate problem slug detected: ${problem.slug}`);
    }
    slugSet.add(problem.slug);
  }

  return { problems, problemsDir };
}

export function toProblemListItem(
  problem: PracticeProblem,
): PracticeProblemListItem {
  return {
    slug: problem.slug,
    questionType: problem.questionType,
    title: problem.title,
    difficulty: problem.difficulty,
    summary: normalizeDescriptionSummary(problem.description),
    supportedLanguages: problem.languageConfigs,
  };
}
