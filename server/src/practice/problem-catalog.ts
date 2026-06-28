import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  PRACTICE_LANGUAGE_KEYS,
  PRACTICE_LANGUAGES,
  type PracticeLanguageKey,
} from './languages';
import { parseProblemYaml } from './problem-parser';
import type {
  PracticeProblem,
  PracticeProblemListItem,
  PracticeProblemMetadata,
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

  return {
    slug,
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

  if ((parsed.slug ?? slug) !== slug) {
    errors.push('slug must match the directory name');
  }

  const visibleTests = readTestCases(problemDir, 'visible', errors);
  const hiddenTests = readTestCases(problemDir, 'hidden', errors);

  if (visibleTests.length === 0) errors.push('at least one visible test is required');
  if (hiddenTests.length === 0) errors.push('at least one hidden test is required');

  validateSamples(metadata.samples, visibleTests, errors);

  const starterCode = readStarterCode(
    problemDir,
    metadata.supportedLanguages,
    errors,
  );

  if (errors.length > 0) {
    throw new Error(
      `Problem ${slug} is invalid:\n${errors.map((err) => `- ${err}`).join('\n')}`,
    );
  }

  return {
    ...metadata,
    starterCode,
    languageConfigs: metadata.supportedLanguages.map(
      (language) => PRACTICE_LANGUAGES[language],
    ),
    visibleTests,
    hiddenTests,
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
    title: problem.title,
    difficulty: problem.difficulty,
    summary: normalizeDescriptionSummary(problem.description),
    supportedLanguages: problem.languageConfigs,
  };
}
