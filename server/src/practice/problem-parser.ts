type ParsedScalar = string | number | boolean | null;
type ParsedNode = ParsedScalar | ParsedNode[] | { [key: string]: ParsedNode };

interface RawLine {
  number: number;
  raw: string;
}

function countIndent(raw: string): number {
  let indent = 0;
  while (indent < raw.length && raw[indent] === ' ') indent += 1;
  return indent;
}

function isIgnorable(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function parseScalar(value: string): ParsedScalar {
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

export function parseProblemYaml(source: string): Record<string, ParsedNode> {
  const trimmed = source.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as Record<string, ParsedNode>;
  }

  const lines = source.replace(/\r\n/g, '\n').split('\n').map((raw, number) => ({
    number,
    raw,
  }));
  let index = 0;

  function peekRelevant(): RawLine | null {
    while (index < lines.length) {
      const line = lines[index];
      if (!isIgnorable(line.raw)) return line;
      index += 1;
    }
    return null;
  }

  function parseBlockScalar(parentIndent: number): string {
    const content: string[] = [];
    let baseIndent: number | null = null;

    while (index < lines.length) {
      const line = lines[index];
      if (line.raw.trim() === '') {
        content.push('');
        index += 1;
        continue;
      }

      const indent = countIndent(line.raw);
      if (indent <= parentIndent) break;

      baseIndent ??= indent;
      content.push(line.raw.slice(baseIndent));
      index += 1;
    }

    return content.join('\n').trimEnd();
  }

  function parseValue(
    rest: string,
    currentIndent: number,
    childIndent: number,
  ): ParsedNode {
    if (rest === '|') {
      return parseBlockScalar(currentIndent);
    }

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

  function parseObject(indent: number): Record<string, ParsedNode> {
    const result: Record<string, ParsedNode> = {};

    while (true) {
      const line = peekRelevant();
      if (!line) break;

      const lineIndent = countIndent(line.raw);
      if (lineIndent < indent) break;
      if (lineIndent > indent) {
        throw new Error(
          `Unexpected indentation on line ${line.number + 1}: ${line.raw}`,
        );
      }

      const trimmedLine = line.raw.trim();
      if (trimmedLine.startsWith('- ')) break;

      index += 1;

      const separatorIndex = trimmedLine.indexOf(':');
      if (separatorIndex <= 0) {
        throw new Error(
          `Invalid key/value pair on line ${line.number + 1}: ${trimmedLine}`,
        );
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rest = trimmedLine.slice(separatorIndex + 1).trim();
      result[key] = parseValue(rest, indent, indent + 2);
    }

    return result;
  }

  function parseArray(indent: number): ParsedNode[] {
    const result: ParsedNode[] = [];

    while (true) {
      const line = peekRelevant();
      if (!line) break;

      const lineIndent = countIndent(line.raw);
      if (lineIndent < indent) break;
      if (lineIndent > indent) {
        throw new Error(
          `Unexpected indentation on line ${line.number + 1}: ${line.raw}`,
        );
      }

      const trimmedLine = line.raw.trim();
      if (!trimmedLine.startsWith('- ')) break;

      index += 1;
      const content = trimmedLine.slice(2).trim();

      if (content === '') {
        const next = peekRelevant();
        if (!next || countIndent(next.raw) <= indent) {
          result.push('');
          continue;
        }
        result.push(
          next.raw.trimStart().startsWith('- ')
            ? parseArray(indent + 2)
            : parseObject(indent + 2),
        );
        continue;
      }

      const separatorIndex = content.indexOf(':');
      if (separatorIndex > 0) {
        const key = content.slice(0, separatorIndex).trim();
        const rest = content.slice(separatorIndex + 1).trim();
        const item: Record<string, ParsedNode> = {};
        item[key] = parseValue(rest, indent + 2, indent + 4);

        while (true) {
          const next = peekRelevant();
          if (!next) break;
          const nextIndent = countIndent(next.raw);
          if (nextIndent <= indent) break;
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

  const document = parseObject(0);
  const remaining = peekRelevant();
  if (remaining) {
    throw new Error(
      `Unexpected trailing content on line ${remaining.number + 1}: ${remaining.raw}`,
    );
  }

  return document;
}
