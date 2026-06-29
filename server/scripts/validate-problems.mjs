import fs from 'node:fs';
import path from 'node:path';

const PRACTICE_LANGUAGES = new Set(['python', 'javascript', 'cpp', 'java']);

function normalizeFixtureText(value) {
  return String(value).replace(/\r\n/g, '\n').trimEnd();
}

function hasUnresolvedPlaceholder(value) {
  return ['未提供', '未公开', '不伪造官方答案'].some((placeholder) =>
    String(value).includes(placeholder),
  );
}

function countIndent(raw) {
  let indent = 0;
  while (indent < raw.length && raw[indent] === ' ') indent += 1;
  return indent;
}

function isIgnorable(raw) {
  const trimmed = raw.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function parseScalar(value) {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseProblemYaml(source) {
  const trimmed = source.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);

  const lines = source.replace(/\r\n/g, '\n').split('\n').map((raw, number) => ({
    raw,
    number,
  }));
  let index = 0;

  function peekRelevant() {
    while (index < lines.length) {
      const line = lines[index];
      if (!isIgnorable(line.raw)) return line;
      index += 1;
    }
    return null;
  }

  function parseBlockScalar(parentIndent) {
    const content = [];
    let baseIndent = null;

    while (index < lines.length) {
      const line = lines[index];
      if (line.raw.trim() === '') {
        content.push('');
        index += 1;
        continue;
      }

      const indent = countIndent(line.raw);
      if (indent <= parentIndent) break;
      if (baseIndent === null) baseIndent = indent;
      content.push(line.raw.slice(baseIndent));
      index += 1;
    }

    return content.join('\n').trimEnd();
  }

  function parseValue(rest, currentIndent, childIndent) {
    if (rest === '|') return parseBlockScalar(currentIndent);
    if (rest === '') {
      const next = peekRelevant();
      if (!next) return '';
      if (countIndent(next.raw) < childIndent) return '';
      return next.raw.trimStart().startsWith('- ')
        ? parseArray(childIndent)
        : parseObject(childIndent);
    }
    return parseScalar(rest);
  }

  function parseObject(indent) {
    const result = {};
    while (true) {
      const line = peekRelevant();
      if (!line) break;
      const lineIndent = countIndent(line.raw);
      if (lineIndent < indent) break;
      if (lineIndent > indent) {
        throw new Error(`Unexpected indentation on line ${line.number + 1}`);
      }

      const trimmedLine = line.raw.trim();
      if (trimmedLine.startsWith('- ')) break;

      index += 1;
      const separatorIndex = trimmedLine.indexOf(':');
      if (separatorIndex <= 0) {
        throw new Error(`Invalid key/value pair on line ${line.number + 1}`);
      }
      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rest = trimmedLine.slice(separatorIndex + 1).trim();
      result[key] = parseValue(rest, indent, indent + 2);
    }
    return result;
  }

  function parseArray(indent) {
    const result = [];
    while (true) {
      const line = peekRelevant();
      if (!line) break;
      const lineIndent = countIndent(line.raw);
      if (lineIndent < indent) break;
      if (lineIndent > indent) {
        throw new Error(`Unexpected indentation on line ${line.number + 1}`);
      }

      const trimmedLine = line.raw.trim();
      if (!trimmedLine.startsWith('- ')) break;

      index += 1;
      const content = trimmedLine.slice(2).trim();
      if (content === '') {
        const next = peekRelevant();
        result.push(
          !next || countIndent(next.raw) <= indent
            ? ''
            : next.raw.trimStart().startsWith('- ')
              ? parseArray(indent + 2)
              : parseObject(indent + 2),
        );
        continue;
      }

      const separatorIndex = content.indexOf(':');
      if (separatorIndex > 0) {
        const item = {};
        const key = content.slice(0, separatorIndex).trim();
        const rest = content.slice(separatorIndex + 1).trim();
        item[key] = parseValue(rest, indent + 2, indent + 4);
        while (true) {
          const next = peekRelevant();
          if (!next || countIndent(next.raw) <= indent) break;
          if (next.raw.trimStart().startsWith('- ')) break;
          Object.assign(item, parseObject(indent + 2));
        }
        result.push(item);
        continue;
      }

      result.push(parseScalar(content));
    }
    return result;
  }

  return parseObject(0);
}

function normalizeString(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty string`);
    return '';
  }
  return value;
}

function normalizePositiveInt(value, field, errors) {
  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${field} must be a positive integer`);
    return 0;
  }
  return value;
}

function isSafeRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]/).includes('..')
  );
}

function readTests(problemDir, visibility, errors) {
  const testsDir = path.join(problemDir, 'tests', visibility);
  if (!fs.existsSync(testsDir)) {
    errors.push(`tests/${visibility} directory is missing`);
    return [];
  }

  const files = fs.readdirSync(testsDir).sort();
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
      return { input: '', output: '' };
    }
    return {
      input: normalizeFixtureText(
        fs.readFileSync(path.join(testsDir, inputFile), 'utf8'),
      ),
      output: normalizeFixtureText(
        fs.readFileSync(path.join(testsDir, outputFile), 'utf8'),
      ),
    };
  });
}

function validateProblem(problemDir) {
  const errors = [];
  const slug = path.basename(problemDir);
  const metadataFile = path.join(problemDir, 'problem.yaml');
  if (!fs.existsSync(metadataFile)) {
    throw new Error(`Problem ${slug} is missing problem.yaml`);
  }

  const parsed = parseProblemYaml(fs.readFileSync(metadataFile, 'utf8'));
  const isAmazonOaProblem = parsed.source === 'amazon-oa';
  const isDebugWorkspace = parsed.questionType === 'debug-workspace';
  const isAmazonDebugProblem =
    isAmazonOaProblem && slug.startsWith('amazon-debug-');
  if (parsed.slug !== slug) errors.push('slug must match the directory name');

  normalizeString(parsed.title, 'title', errors);
  const difficulty = normalizeString(parsed.difficulty, 'difficulty', errors);
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('difficulty must be one of: easy, medium, hard');
  }
  normalizeString(parsed.description, 'description', errors);
  normalizeString(parsed.inputFormat, 'inputFormat', errors);
  normalizeString(parsed.outputFormat, 'outputFormat', errors);
  normalizeString(parsed.constraints, 'constraints', errors);
  normalizePositiveInt(parsed.timeLimitMs, 'timeLimitMs', errors);
  normalizePositiveInt(parsed.memoryLimitKb, 'memoryLimitKb', errors);

  if (!Array.isArray(parsed.supportedLanguages) || parsed.supportedLanguages.length === 0) {
    errors.push('supportedLanguages must be a non-empty array');
  } else {
    for (const language of parsed.supportedLanguages) {
      if (!PRACTICE_LANGUAGES.has(language)) {
        errors.push(`Unknown supported language: ${language}`);
      }
    }
  }

  if (!Array.isArray(parsed.samples)) {
    errors.push('samples must be an array');
  } else if (!isDebugWorkspace && parsed.samples.length === 0) {
    errors.push('samples must contain at least one example');
  } else {
    for (const sample of parsed.samples) {
      if (!sample || typeof sample !== 'object') {
        errors.push('each sample must be an object');
        continue;
      }
      normalizeString(sample.input, 'samples[].input', errors);
      normalizeString(sample.output, 'samples[].output', errors);
    }
  }

  if (isAmazonDebugProblem && !isDebugWorkspace) {
    errors.push('amazon-debug-* amazon-oa problems must use questionType: debug-workspace');
  }

  const visibleTests = isDebugWorkspace ? [] : readTests(problemDir, 'visible', errors);
  const hiddenTests = isDebugWorkspace ? [] : readTests(problemDir, 'hidden', errors);
  if (!isDebugWorkspace && visibleTests.length === 0) {
    errors.push('at least one visible test is required');
  }
  if (!isDebugWorkspace && hiddenTests.length === 0) {
    errors.push('at least one hidden test is required');
  }

  const editorialFile = path.join(problemDir, 'editorial.md');
  const editorial = fs.existsSync(editorialFile)
    ? fs.readFileSync(editorialFile, 'utf8')
    : '';
  if (isAmazonOaProblem && editorial.trim() === '') {
    errors.push('editorial.md is required for amazon-oa problems');
  }

  if (!isDebugWorkspace && Array.isArray(parsed.samples)) {
    for (const sample of parsed.samples) {
      const match = visibleTests.find(
        (test) =>
          test.input === normalizeFixtureText(sample.input) &&
          test.output === normalizeFixtureText(sample.output),
      );
      if (!match) {
        errors.push('each sample must match a visible test input/output pair');
        break;
      }
    }
  }

  if (!isDebugWorkspace) {
    const starterDir = path.join(problemDir, 'starter-code');
    for (const language of parsed.supportedLanguages ?? []) {
      const fileMap = {
        python: 'python.py',
        javascript: 'javascript.js',
        cpp: 'cpp.cpp',
        java: 'java.java',
        c: 'c.c',
      };
      const starterFile = fileMap[language];
      if (!starterFile || !fs.existsSync(path.join(starterDir, starterFile))) {
        errors.push(`Missing starter-code/${starterFile ?? language}`);
      }
    }
  }

  if (isDebugWorkspace) {
    const workspaceDir = path.join(problemDir, 'workspace');
    const manifestPath = path.join(workspaceDir, 'manifest.json');
    const seedDir = path.join(workspaceDir, 'seed');

    if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
      errors.push('workspace directory is required for debug-workspace problems');
    }

    if (!fs.existsSync(manifestPath)) {
      errors.push('workspace/manifest.json is required');
    } else {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.stack !== 'node') {
          errors.push('workspace manifest stack must be "node"');
        }
        if (
          !Array.isArray(manifest.entryFiles) ||
          manifest.entryFiles.length === 0 ||
          manifest.entryFiles.some((value) => !isSafeRelativePath(value))
        ) {
          errors.push('workspace entryFiles must be a non-empty array of safe relative paths');
        }
        if (
          !Array.isArray(manifest.editablePaths) ||
          manifest.editablePaths.length === 0 ||
          manifest.editablePaths.some((value) => !isSafeRelativePath(value))
        ) {
          errors.push('workspace editablePaths must be a non-empty array of safe relative paths');
        }
        if (!isSafeRelativePath(manifest.visibleTestScript)) {
          errors.push('workspace visibleTestScript must be a safe relative path');
        }
        if (!isSafeRelativePath(manifest.submitTestScript)) {
          errors.push('workspace submitTestScript must be a safe relative path');
        }
      } catch {
        errors.push('workspace/manifest.json must be valid JSON');
      }
    }

    if (!fs.existsSync(seedDir) || !fs.statSync(seedDir).isDirectory()) {
      errors.push('workspace/seed directory is required');
    }
  }

  if (isAmazonOaProblem) {
    const judgeFacingFields = [
      parsed.title,
      parsed.description,
      parsed.inputFormat,
      parsed.outputFormat,
      parsed.constraints,
      editorial,
      ...(Array.isArray(parsed.samples)
        ? parsed.samples.flatMap((sample) => [
            sample?.input,
            sample?.output,
            sample?.explanation,
          ])
        : []),
    ];
    if (judgeFacingFields.some(hasUnresolvedPlaceholder)) {
      errors.push(
        'amazon-oa problem content contains unresolved source placeholders',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Problem ${slug} is invalid:\n${errors.map((error) => `- ${error}`).join('\n')}`,
    );
  }
}

function main() {
  const dirFlagIndex = process.argv.indexOf('--problems-dir');
  const problemsDir =
    dirFlagIndex !== -1 && process.argv[dirFlagIndex + 1]
      ? path.resolve(process.cwd(), process.argv[dirFlagIndex + 1])
      : path.join(process.cwd(), '..', 'problems');
  if (!fs.existsSync(problemsDir)) {
    throw new Error(`Could not find problems/ at ${problemsDir}`);
  }

  const entries = fs
    .readdirSync(problemsDir)
    .map((entry) => path.join(problemsDir, entry))
    .filter((entry) => fs.statSync(entry).isDirectory());

  if (entries.length === 0) {
    throw new Error('No practice problems were found under problems/');
  }

  for (const entry of entries) validateProblem(entry);
  console.log(`Validated ${entries.length} practice problem(s) in ${problemsDir}`);
}

main();
