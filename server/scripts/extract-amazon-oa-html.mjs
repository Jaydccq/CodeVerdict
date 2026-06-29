import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error(
    'Usage: node scripts/extract-amazon-oa-html.mjs --input /path/source.html --output /path/manifest.json',
  );
  process.exit(1);
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decodeHtml(
    String(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFirst(pattern, source, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not extract ${label}`);
  }
  return stripTags(match[1]);
}

function extractFields(articleHtml) {
  const fields = {};
  const fieldPattern =
    /<h4>([\s\S]*?)<\/h4>\s*<div class="field-text">([\s\S]*?)<\/div>/g;

  for (const match of articleHtml.matchAll(fieldPattern)) {
    fields[stripTags(match[1])] = stripTags(match[2]);
  }

  return fields;
}

function extractTags(articleHtml) {
  return Array.from(articleHtml.matchAll(/<span class="tag">([\s\S]*?)<\/span>/g))
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function extractArticles(html) {
  const articles = [];
  const articlePattern =
    /<article class="card" id="([^"]+)">([\s\S]*?)<\/article>/g;

  for (const match of html.matchAll(articlePattern)) {
    const sourceId = match[1];
    const articleHtml = match[2];
    const category =
      sourceId.startsWith('lc-') ? 'algorithm' : 'ai-coding-debug';

    articles.push({
      sourceId,
      category,
      title: extractFirst(/<h3>([\s\S]*?)<\/h3>/, articleHtml, sourceId),
      tags: extractTags(articleHtml),
      fields: extractFields(articleHtml),
    });
  }

  return articles;
}

function main() {
  const input = readFlag('--input');
  const output = readFlag('--output');
  if (!input || !output) usage();

  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);
  const html = fs.readFileSync(inputPath, 'utf8');
  const items = extractArticles(html);

  const algorithmCount = items.filter((item) => item.category === 'algorithm').length;
  const aiDebugCount = items.filter(
    (item) => item.category === 'ai-coding-debug',
  ).length;

  if (items.length !== 27 || algorithmCount !== 16 || aiDebugCount !== 11) {
    throw new Error(
      `Unexpected source counts: total=${items.length}, algorithm=${algorithmCount}, ai=${aiDebugCount}`,
    );
  }

  const manifest = {
    sourcePath: inputPath,
    generatedAt: new Date().toISOString(),
    counts: {
      total: items.length,
      algorithm: algorithmCount,
      aiCodingDebug: aiDebugCount,
    },
    items,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Extracted ${items.length} Amazon OA item(s) to ${outputPath}`,
  );
}

main();
