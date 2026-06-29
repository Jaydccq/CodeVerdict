import fs from 'node:fs';
import path from 'node:path';

const starterFileMap = {
  python: 'python.py',
  javascript: 'javascript.js',
  cpp: 'cpp.cpp',
  java: 'java.java',
};

function hasUnresolvedPlaceholder(value) {
  return ['未提供', '未公开', '不伪造官方答案'].some((placeholder) =>
    String(value).includes(placeholder),
  );
}

function usage() {
  console.error(
    'Usage: npm --prefix server run import:problem -- --input /absolute/or/relative/problem.json',
  );
  process.exit(1);
}

function indentBlock(value, depth = 2) {
  return String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `${' '.repeat(depth)}${line}`)
    .join('\n');
}

function blockField(key, value, depth = 0) {
  return `${' '.repeat(depth)}${key}: |\n${indentBlock(value, depth + 2)}`;
}

function writeYaml(problem) {
  const lines = [
    `slug: ${problem.slug}`,
    ...(problem.source ? [`source: ${problem.source}`] : []),
    `title: ${problem.title}`,
    `difficulty: ${problem.difficulty}`,
    blockField('description', problem.description),
    blockField('inputFormat', problem.inputFormat),
    blockField('outputFormat', problem.outputFormat),
    blockField('constraints', problem.constraints),
    'samples:',
  ];

  for (const sample of problem.samples) {
    lines.push(`  - input: |`);
    lines.push(indentBlock(sample.input, 6));
    lines.push(`    output: |`);
    lines.push(indentBlock(sample.output, 6));
    if (sample.explanation) {
      lines.push(`    explanation: |`);
      lines.push(indentBlock(sample.explanation, 6));
    }
  }

  lines.push('supportedLanguages:');
  for (const language of problem.supportedLanguages) {
    lines.push(`  - ${language}`);
  }
  lines.push(`timeLimitMs: ${problem.timeLimitMs}`);
  lines.push(`memoryLimitKb: ${problem.memoryLimitKb}`);
  return `${lines.join('\n')}\n`;
}

function writeTests(baseDir, folder, tests) {
  const targetDir = path.join(baseDir, 'tests', folder);
  fs.mkdirSync(targetDir, { recursive: true });
  for (const [index, test] of tests.entries()) {
    const id = String(index + 1).padStart(3, '0');
    fs.writeFileSync(path.join(targetDir, `${id}.in`), `${test.input}`);
    fs.writeFileSync(path.join(targetDir, `${id}.out`), `${test.output}`);
  }
}

function main() {
  const inputFlagIndex = process.argv.indexOf('--input');
  if (inputFlagIndex === -1 || !process.argv[inputFlagIndex + 1]) usage();

  const inputPath = path.resolve(process.cwd(), process.argv[inputFlagIndex + 1]);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const problem = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const requiredFields = [
    'slug',
    'title',
    'difficulty',
    'description',
    'inputFormat',
    'outputFormat',
    'constraints',
    'samples',
    'supportedLanguages',
    'timeLimitMs',
    'memoryLimitKb',
    'visibleTests',
    'hiddenTests',
  ];

  for (const field of requiredFields) {
    if (!(field in problem)) {
      throw new Error(`Missing required field in import JSON: ${field}`);
    }
  }

  if (problem.source === 'amazon-oa') {
    if (typeof problem.editorial !== 'string' || problem.editorial.trim() === '') {
      throw new Error('Amazon OA imports require a non-empty editorial field');
    }

    const judgeFacingFields = [
      problem.title,
      problem.description,
      problem.inputFormat,
      problem.outputFormat,
      problem.constraints,
      problem.editorial,
      ...problem.samples.flatMap((sample) => [
        sample.input,
        sample.output,
        sample.explanation ?? '',
      ]),
    ];

    if (judgeFacingFields.some(hasUnresolvedPlaceholder)) {
      throw new Error('Amazon OA import contains unresolved source placeholders');
    }
  }

  const problemsDir = path.resolve(process.cwd(), '..', 'problems');
  const targetDir = path.join(problemsDir, problem.slug);
  fs.mkdirSync(path.join(targetDir, 'starter-code'), { recursive: true });

  fs.writeFileSync(path.join(targetDir, 'problem.yaml'), writeYaml(problem));

  if (problem.editorial !== undefined) {
    fs.writeFileSync(path.join(targetDir, 'editorial.md'), `${problem.editorial}`);
  }

  for (const language of problem.supportedLanguages) {
    const starterFile = starterFileMap[language];
    if (!starterFile) {
      throw new Error(`Unsupported language for import: ${language}`);
    }
    const starterCode = problem.starterCode?.[language] ?? '';
    fs.writeFileSync(
      path.join(targetDir, 'starter-code', starterFile),
      starterCode,
    );
  }

  writeTests(targetDir, 'visible', problem.visibleTests);
  writeTests(targetDir, 'hidden', problem.hiddenTests);

  console.log(`Imported problem ${problem.slug} into ${targetDir}`);
}

main();
