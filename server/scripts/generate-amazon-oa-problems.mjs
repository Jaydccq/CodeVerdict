import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = path.resolve(
  process.cwd(),
  '../data/imports/amazon-oa-source-manifest.json',
);
const PROBLEMS_DIR = path.resolve(process.cwd(), '../problems');

const starterCode = {
  python: `import sys\n\n# Read from standard input and write the answer to standard output.\ndef solve(data: str) -> str:\n    return \"\"\n\nif __name__ == \"__main__\":\n    print(solve(sys.stdin.read()))\n`,
  javascript: `const fs = require('fs');\n\nfunction solve(input) {\n  return '';\n}\n\nprocess.stdout.write(String(solve(fs.readFileSync(0, 'utf8'))));\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    return 0;\n}\n`,
  java: `import java.io.*;\nimport java.util.*;\n\nclass Main {\n    public static void main(String[] args) throws Exception {\n        new BufferedReader(new InputStreamReader(System.in));\n    }\n}\n`,
};

const starterFile = {
  python: 'python.py',
  javascript: 'javascript.js',
  cpp: 'cpp.cpp',
  java: 'java.java',
};

function lines(input) {
  return input.trim().split(/\n+/).map((line) => line.trim());
}

function nums(line) {
  return line.trim().split(/\s+/).filter(Boolean).map(Number);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function normalizeOutput(value) {
  return String(value).trimEnd();
}

function yamlBlock(key, value, depth = 0) {
  const indent = ' '.repeat(depth + 2);
  const body = String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
  return `${' '.repeat(depth)}${key}: |\n${body}`;
}

function writeProblemYaml(problem) {
  const out = [
    `slug: ${problem.slug}`,
    'source: amazon-oa',
    `title: ${problem.title}`,
    `difficulty: ${problem.difficulty}`,
    yamlBlock('description', problem.description),
    yamlBlock('inputFormat', problem.inputFormat),
    yamlBlock('outputFormat', problem.outputFormat),
    yamlBlock('constraints', problem.constraints),
    'samples:',
  ];

  for (const sample of problem.samples) {
    out.push('  - input: |');
    out.push(
      sample.input
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n'),
    );
    out.push('    output: |');
    out.push(
      sample.output
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n'),
    );
    out.push('    explanation: |');
    out.push(
      sample.explanation
        .split('\n')
        .map((line) => `      ${line}`)
        .join('\n'),
    );
  }

  out.push('supportedLanguages:');
  out.push('  - python');
  out.push('  - javascript');
  out.push('  - cpp');
  out.push('  - java');
  out.push(`timeLimitMs: ${problem.timeLimitMs}`);
  out.push(`memoryLimitKb: ${problem.memoryLimitKb}`);
  return `${out.join('\n')}\n`;
}

function writeTestFiles(problemDir, visibility, tests) {
  const target = path.join(problemDir, 'tests', visibility);
  fs.mkdirSync(target, { recursive: true });
  tests.forEach((test, index) => {
    const id = String(index + 1).padStart(3, '0');
    fs.writeFileSync(path.join(target, `${id}.in`), test.input);
    fs.writeFileSync(path.join(target, `${id}.out`), test.output);
  });
}

function circularTravel(input) {
  const [mLine, timesLine, hubsLine] = lines(input);
  const m = Number(mLine);
  const times = nums(timesLine);
  const hubs = nums(hubsLine);
  const prefix = [0];
  for (const t of times) prefix.push(prefix[prefix.length - 1] + t);
  const total = prefix[m];
  let current = 1;
  let answer = 0;
  for (const target of hubs) {
    const a = Math.min(current, target) - 1;
    const b = Math.max(current, target) - 1;
    const clockwise = prefix[b] - prefix[a];
    answer += Math.min(clockwise, total - clockwise);
    current = target;
  }
  return answer;
}

function circularQueries(input) {
  const [nLine, distLine, qLine, ...queryLines] = lines(input);
  const n = Number(nLine);
  const dist = nums(distLine);
  const q = Number(qLine);
  const prefix = [0];
  for (const d of dist) prefix.push(prefix[prefix.length - 1] + d);
  const total = prefix[n];
  let answer = 0;
  for (let i = 0; i < q; i += 1) {
    const [aRaw, bRaw] = nums(queryLines[i]);
    const a = Math.min(aRaw, bRaw);
    const b = Math.max(aRaw, bRaw);
    const forward = prefix[b] - prefix[a];
    answer += Math.min(forward, total - forward);
  }
  return answer;
}

function largestSequence(input) {
  const [nLine, valuesLine, stateLine, mLine] = lines(input);
  const n = Number(nLine);
  const values = nums(valuesLine);
  const state = stateLine.split('').map(Number);
  const m = Number(mLine);
  const used = Array(n).fill(false);
  const result = [];
  for (let step = 0; step < m; step += 1) {
    let best = -1;
    for (let i = 0; i < n; i += 1) {
      if (state[i] === 1 && !used[i] && (best === -1 || values[i] > values[best])) {
        best = i;
      }
    }
    used[best] = true;
    result.push(values[best]);
    const next = state.slice();
    for (let i = 1; i < n; i += 1) {
      if (state[i] === 0 && state[i - 1] === 1) next[i] = 1;
    }
    for (let i = 0; i < n; i += 1) state[i] = next[i];
  }
  return result.join(' ');
}

function maxWindow(input) {
  const [first, valuesLine] = lines(input);
  const [n, k] = nums(first);
  const values = nums(valuesLine);
  let current = sum(values.slice(0, k));
  let best = current;
  for (let i = k; i < n; i += 1) {
    current += values[i] - values[i - k];
    best = Math.max(best, current);
  }
  return best;
}

function lcsConflicts(input) {
  const [a, b] = lines(input);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return m + n - 2 * dp[m][n];
}

function equalizeMedian(input) {
  const [, valuesLine] = lines(input);
  const values = nums(valuesLine).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  return sum(values.map((value) => Math.abs(value - median)));
}

function topPairSums(input) {
  const [first, aLine, bLine] = lines(input);
  const [, k] = nums(first);
  const a = nums(aLine);
  const b = nums(bLine);
  const pairs = [];
  for (const x of a) {
    for (const y of b) pairs.push(x + y);
  }
  pairs.sort((left, right) => right - left);
  return sum(pairs.slice(0, k));
}

function primaryBackup(input) {
  const [, primaryLine, backupLine] = lines(input);
  const primary = nums(primaryLine).sort((a, b) => b - a);
  const backups = nums(backupLine).sort((a, b) => a - b);
  let answer = 0;
  for (const p of primary) {
    const index = backups.findIndex((b) => b >= p);
    if (index !== -1) {
      answer += p;
      backups.splice(index, 1);
    }
  }
  return answer;
}

function nonAdjacentWork(input) {
  const [, valuesLine] = lines(input);
  const values = nums(valuesLine);
  let take = 0;
  let skip = 0;
  for (const value of values) {
    const nextTake = skip + value;
    skip = Math.max(skip, take);
    take = nextTake;
  }
  return Math.max(take, skip);
}

function restocks(input) {
  const [first, changesLine] = lines(input);
  const [, start, threshold, amount] = nums(first);
  const changes = nums(changesLine);
  let stock = start;
  let answer = 0;
  for (const change of changes) {
    stock += change;
    while (stock < threshold) {
      stock += amount;
      answer += 1;
    }
  }
  return answer;
}

function gridRadius(input) {
  const [first, ...gridLines] = lines(input);
  const [r, c] = nums(first);
  const cells = [];
  for (let i = 0; i < r; i += 1) {
    for (let j = 0; j < c; j += 1) {
      if (gridLines[i][j] === '1') cells.push([i, j]);
    }
  }
  let best = Infinity;
  for (let x = 0; x < r; x += 1) {
    for (let y = 0; y < c; y += 1) {
      const points = gridLines[x][y] === '1' ? cells : [...cells, [x, y]];
      let farthest = 0;
      for (const [i, j] of points) {
        let nearest = Infinity;
        for (const [a, b] of points) {
          nearest = Math.min(nearest, Math.abs(i - a) + Math.abs(j - b));
        }
        farthest = Math.max(farthest, nearest);
      }
      best = Math.min(best, farthest);
    }
  }
  return best;
}

function weightedMedianCost(input) {
  const [, valueLine, costLine] = lines(input);
  const values = nums(valueLine);
  const costs = nums(costLine);
  let best = Infinity;
  for (const target of values) {
    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      total += Math.abs(values[i] - target) * costs[i];
    }
    best = Math.min(best, total);
  }
  return best;
}

function maxProtected(input) {
  const [first, positionsLine, populationsLine] = lines(input);
  const [, k, radius] = nums(first);
  const positions = nums(positionsLine);
  const populations = nums(populationsLine);
  const cover = positions.map((center) => {
    let total = 0;
    for (let i = 0; i < positions.length; i += 1) {
      if (Math.abs(positions[i] - center) <= radius) total += populations[i];
    }
    return total;
  });
  cover.sort((a, b) => b - a);
  return sum(cover.slice(0, k));
}

function conversionCost(input) {
  const [source, target, costLine] = lines(input);
  const costs = nums(costLine);
  let answer = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== target[i]) answer += costs[i];
  }
  return answer;
}

function movieScore(input) {
  const [first, wantedLine, ...movieLines] = lines(input);
  const [n, minRating] = nums(first);
  const wanted = new Set(wantedLine.split(/\s+/));
  let best = '';
  let bestScore = -1;
  for (let i = 0; i < n; i += 1) {
    const [name, ratingText, ...genres] = movieLines[i].split(/\s+/);
    const rating = Number(ratingText);
    if (rating < minRating) continue;
    const score = rating * 10 + genres.filter((genre) => wanted.has(genre)).length;
    if (score > bestScore || (score === bestScore && name < best)) {
      best = name;
      bestScore = score;
    }
  }
  return best || 'NO_MATCH';
}

function paymentDue(input) {
  const [todayLine, countLine, ...paymentLines] = lines(input);
  const today = Number(todayLine);
  const n = Number(countLine);
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const [due, amount, active] = nums(paymentLines[i]);
    if (active === 1 && due <= today) total += amount;
  }
  return total;
}

function resetPassword(input) {
  const [nowLine, countLine, ...tokenLines] = lines(input);
  const now = Number(nowLine);
  const n = Number(countLine);
  let valid = 0;
  for (let i = 0; i < n; i += 1) {
    const [created, ttl, used, revoked] = nums(tokenLines[i]);
    if (used === 0 && revoked === 0 && now <= created + ttl) valid += 1;
  }
  return valid;
}

function issueComments(input) {
  const [countLine, ...events] = lines(input);
  const n = Number(countLine);
  const comments = new Map();
  for (let i = 0; i < n; i += 1) {
    const [op, issue, comment] = events[i].split(/\s+/);
    const set = comments.get(issue) ?? new Set();
    if (op === 'ADD') set.add(comment);
    if (op === 'DEL') set.delete(comment);
    comments.set(issue, set);
  }
  return Array.from(comments.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([issue, set]) => `${issue}:${set.size}`)
    .join('\n');
}

function returnRefund(input) {
  const [countLine, ...rows] = lines(input);
  const n = Number(countLine);
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const [days, price, damaged, opened] = nums(rows[i]);
    if (days <= 30 && damaged === 0) total += opened === 1 ? Math.floor(price / 2) : price;
  }
  return total;
}

function apiFailures(input) {
  const [countLine, ...rows] = lines(input);
  const n = Number(countLine);
  let failed = 0;
  for (let i = 0; i < n; i += 1) {
    const [expected, actual, latency] = nums(rows[i]);
    if (expected !== actual || latency > 500) failed += 1;
  }
  return failed;
}

function recurringWallet(input) {
  const [first, ...rows] = lines(input);
  const [n, balance] = nums(first);
  let remaining = balance;
  let paid = 0;
  for (let i = 0; i < n; i += 1) {
    const amount = Number(rows[i]);
    if (remaining >= amount) {
      remaining -= amount;
      paid += 1;
    }
  }
  return `${paid} ${remaining}`;
}

function activityLogs(input) {
  const [countLine, ...rows] = lines(input);
  const n = Number(countLine);
  const seen = new Set();
  for (let i = 0; i < n; i += 1) {
    const [entity, action] = rows[i].split(/\s+/);
    if (['CREATE', 'UPDATE', 'COMMENT', 'CLOSE'].includes(action)) {
      seen.add(`${entity}:${action}`);
    }
  }
  return seen.size;
}

function rbac(input) {
  const [first, ...rows] = lines(input);
  const [n, m] = nums(first);
  const permissions = new Map();
  for (let i = 0; i < n; i += 1) {
    const [role, ...perms] = rows[i].split(/\s+/);
    permissions.set(role, new Set(perms));
  }
  const answers = [];
  for (let i = 0; i < m; i += 1) {
    const [role, permission] = rows[n + i].split(/\s+/);
    answers.push(permissions.get(role)?.has(permission) ? 'ALLOW' : 'DENY');
  }
  return answers.join('\n');
}

function subIssues(input) {
  const [countLine, ...rows] = lines(input);
  const n = Number(countLine);
  const children = new Map();
  for (let i = 0; i < n; i += 1) {
    const [parent, child] = rows[i].split(/\s+/);
    children.set(parent, (children.get(parent) ?? 0) + 1);
    if (!children.has(child)) children.set(child, 0);
  }
  return Array.from(children.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([issue, count]) => `${issue}:${count}`)
    .join('\n');
}

function moderation(input) {
  const [first, ...rows] = lines(input);
  const [n, limit] = nums(first);
  const perUser = new Map();
  const banned = new Set(['spam', 'scam', 'abuse']);
  let accepted = 0;
  for (let i = 0; i < n; i += 1) {
    const [user, word] = rows[i].split(/\s+/);
    const used = perUser.get(user) ?? 0;
    if (used >= limit || banned.has(word)) continue;
    perUser.set(user, used + 1);
    accepted += 1;
  }
  return accepted;
}

const solverByKind = {
  circularTravel,
  circularQueries,
  largestSequence,
  maxWindow,
  lcsConflicts,
  equalizeMedian,
  topPairSums,
  primaryBackup,
  nonAdjacentWork,
  restocks,
  gridRadius,
  weightedMedianCost,
  maxProtected,
  conversionCost,
  movieScore,
  paymentDue,
  resetPassword,
  issueComments,
  returnRefund,
  apiFailures,
  recurringWallet,
  activityLogs,
  rbac,
  subIssues,
  moderation,
};

function problem({
  sourceId,
  slug,
  title,
  difficulty = 'medium',
  kind,
  statement,
  inputFormat,
  outputFormat,
  constraints,
  visible,
  hidden,
  editorial,
}) {
  const solve = solverByKind[kind];
  const build = (input) => ({
    input: input.trimEnd(),
    output: normalizeOutput(solve(input)),
  });
  const visibleTests = visible.map(build);
  const hiddenTests = hidden.map(build);
  return {
    sourceId,
    slug,
    title,
    difficulty,
    description: `${statement}\n\nThis is a repository-authored Amazon OA practice adaptation. The fixtures are deterministic practice tests, not official hidden tests.`,
    inputFormat,
    outputFormat,
    constraints,
    samples: visibleTests.slice(0, 2).map((test) => ({
      ...test,
      explanation: 'The output is produced by applying the rule described in the statement to the input instance.',
    })),
    visibleTests,
    hiddenTests,
    timeLimitMs: 2000,
    memoryLimitKb: 262144,
    editorial: `# ${title}\n\n${editorial}\n\nReference complexity depends on the stated approach and input bounds. The generated fixtures in this repository are authored practice tests.`,
  };
}

const definitions = [
  problem({
    sourceId: 'lc-01',
    slug: 'amazon-drone-circular-hub-travel',
    title: 'Drone Delivery Circular Hub Minimum Travel Time',
    kind: 'circularTravel',
    statement: 'A drone starts at hub 1 on a circular route. Moving along edge i costs transitionTime[i]. Visit the requested hubs in order and minimize total travel time by choosing the shorter direction on each segment.',
    inputFormat: 'Line 1: m. Line 2: m edge costs. Line 3: requested hubs in visit order.',
    outputFormat: 'Print the minimum total travel time.',
    constraints: '2 <= m <= 200000. Costs are positive. Hub IDs are 1-based.',
    visible: ['3\n3 2 1\n1 3 3 2', '5\n4 1 7 3 2\n5 2 4'],
    hidden: ['4\n5 5 5 5\n4 1 3 3', '6\n2 9 1 8 3 4\n6 5 2 1'],
    editorial: 'Precompute prefix sums around the cycle. For each consecutive pair, compute the distance along one arc and subtract from the total cycle length to get the opposite arc, then add the smaller value.',
  }),
  problem({
    sourceId: 'lc-10',
    slug: 'amazon-circular-array-query-distance',
    title: 'Circular Array Prefix Sum Multi-query Distance',
    kind: 'circularQueries',
    statement: 'Given distances between adjacent stops on a circle, answer several shortest-distance queries and return the sum of all query distances.',
    inputFormat: 'Line 1: n. Line 2: n circular edge distances. Line 3: q. Next q lines: two 0-based stop indices.',
    outputFormat: 'Print the sum of shortest circular distances over all queries.',
    constraints: '2 <= n <= 200000. 1 <= q <= 200000.',
    visible: ['4\n1 2 3 4\n2\n0 1\n1 3', '3\n5 5 5\n3\n0 0\n0 2\n1 2'],
    hidden: ['5\n2 9 1 4 7\n3\n4 1\n2 2\n0 3', '6\n3 1 4 1 5 9\n4\n0 5\n2 4\n3 1\n5 5'],
    editorial: 'Prefix sums turn each clockwise arc into O(1). The counterclockwise arc is total minus clockwise; add the smaller one for every query.',
  }),
  problem({
    sourceId: 'lc-05',
    slug: 'amazon-construct-largest-sequence',
    title: 'Construct Lexicographically Largest Sequence',
    kind: 'largestSequence',
    statement: 'Build a sequence of m values. At each step choose one currently unlocked unused index. After the choice, every locked index immediately to the right of an unlocked index becomes unlocked. Maximize the produced sequence lexicographically.',
    inputFormat: 'Line 1: n. Line 2: values. Line 3: binary state string. Line 4: m.',
    outputFormat: 'Print the selected values in order.',
    constraints: '1 <= n <= 200000. At least m values become selectable.',
    visible: ['4\n10 5 7 6\n0101\n2', '5\n4 9 1 8 7\n10010\n3'],
    hidden: ['5\n8 8 3 10 2\n10000\n4', '6\n1 20 3 19 4 18\n101000\n5'],
    editorial: 'The optimal next element is always the largest currently unlocked unused value. Use a max heap in production; the reference generator scans because fixtures are small.',
  }),
  problem({
    sourceId: 'lc-06',
    slug: 'amazon-maximum-money-k-bags',
    title: 'Maximum Money by Taking K Consecutive Bags',
    kind: 'maxWindow',
    statement: 'Given money in n bags arranged in a row, choose exactly k consecutive bags to maximize collected money.',
    inputFormat: 'Line 1: n k. Line 2: n bag values.',
    outputFormat: 'Print the maximum sum of any k consecutive bags.',
    constraints: '1 <= k <= n <= 200000.',
    visible: ['5 3\n2 1 5 1 3', '4 2\n9 -1 4 7'],
    hidden: ['6 4\n3 3 3 3 3 3', '7 1\n-5 10 -2 8 0 4 1'],
    editorial: 'Maintain a sliding window of length k. Move the window one position at a time by adding the entering value and removing the leaving value.',
  }),
  problem({
    sourceId: 'lc-08',
    slug: 'amazon-branch-minimum-conflicts-incomplete',
    title: 'Merging Branch Minimum Commit Conflict Count',
    kind: 'lcsConflicts',
    statement: 'Two branches are represented by commit strings. Commits kept in the same relative order can merge cleanly. Compute the minimum number of commits that must be treated as conflicts.',
    inputFormat: 'Line 1: primary commit string. Line 2: secondary commit string.',
    outputFormat: 'Print the minimum conflict count.',
    constraints: '1 <= length <= 1000.',
    visible: ['abcde\nace', 'amazon\nazamon'],
    hidden: ['abcdef\nfbdamn', 'aaaa\nbbbb'],
    editorial: 'The cleanly shared commits form a longest common subsequence. All other commits are conflicts, so the answer is m + n - 2 * LCS.',
  }),
  problem({
    sourceId: 'lc-11',
    slug: 'amazon-warehouse-price-adjustment',
    title: 'Amazon Warehouse Price Adjustment Minimum Operations',
    kind: 'equalizeMedian',
    statement: 'Each operation changes one product price by 1. Find the minimum operations needed to make all prices equal.',
    inputFormat: 'Line 1: n. Line 2: n prices.',
    outputFormat: 'Print the minimum operation count.',
    constraints: '1 <= n <= 200000.',
    visible: ['5\n1 2 3 10 12', '4\n7 7 7 7'],
    hidden: ['6\n1 100 2 99 3 98', '3\n-5 0 5'],
    editorial: 'The sum of absolute deviations is minimized at any median. Sort the prices, choose the median, and sum absolute differences.',
  }),
  problem({
    sourceId: 'lc-12',
    slug: 'amazon-maximum-total-dataflow',
    title: 'Maximum Total DataFlow from Unique Node Pairs',
    kind: 'topPairSums',
    statement: 'Choose k unique pairs, one node from each of two groups. A pair dataflow is the sum of both node capacities. Maximize total dataflow.',
    inputFormat: 'Line 1: n k. Line 2: group A capacities. Line 3: group B capacities.',
    outputFormat: 'Print the maximum total dataflow of k pairs.',
    constraints: '1 <= n <= 2000. 1 <= k <= n*n.',
    visible: ['3 2\n5 1 4\n3 7 2', '2 3\n10 1\n2 9'],
    hidden: ['3 4\n8 6 5\n4 3 2', '4 1\n1 2 3 4\n10 20 30 40'],
    editorial: 'Generate candidate pair sums, sort descending, and add the top k. For larger bounds, use a heap over sorted arrays.',
  }),
  problem({
    sourceId: 'lc-13',
    slug: 'amazon-primary-backup-memory',
    title: 'Maximum System Memory Capacity with Primary and Backup Servers',
    kind: 'primaryBackup',
    statement: 'A primary server with capacity p can be protected by a backup server with capacity at least p. Pair servers to maximize total protected primary capacity.',
    inputFormat: 'Line 1: n. Line 2: primary capacities. Line 3: backup capacities.',
    outputFormat: 'Print the maximum total protected primary capacity.',
    constraints: '1 <= n <= 200000.',
    visible: ['3\n5 3 8\n4 8 6', '4\n10 9 2 1\n1 2 9 10'],
    hidden: ['3\n7 7 7\n6 7 8', '5\n1 5 9 10 11\n11 9 5 1 1'],
    editorial: 'Consider primary capacities from largest to smallest and assign the smallest backup that can cover each chosen primary. This preserves large backups for only when needed.',
  }),
  problem({
    sourceId: 'lc-14',
    slug: 'amazon-warehouse-price-adjustment-q2',
    title: 'Second OA Q2 Warehouse Price Adjustment',
    kind: 'equalizeMedian',
    statement: 'This practice variant uses the same warehouse price operation: changing one price by 1 costs one operation. Minimize total operations to equalize all prices.',
    inputFormat: 'Line 1: n. Line 2: prices.',
    outputFormat: 'Print the minimum operations.',
    constraints: '1 <= n <= 200000.',
    visible: ['3\n2 9 4', '6\n1 1 2 2 3 3'],
    hidden: ['5\n100 1 1 1 100', '4\n-2 -2 8 8'],
    editorial: 'Use the median because it minimizes absolute distance on a line. The answer is the total distance from every value to the median.',
  }),
  problem({
    sourceId: 'lc-16',
    slug: 'amazon-robot-work-idle-assignment',
    title: 'Robot Work or Idle State Assignment',
    kind: 'nonAdjacentWork',
    statement: 'A robot can work on selected time slots, but two adjacent slots cannot both be work slots. Maximize total work value.',
    inputFormat: 'Line 1: n. Line 2: n work values.',
    outputFormat: 'Print the maximum achievable work value.',
    constraints: '1 <= n <= 200000.',
    visible: ['5\n2 7 9 3 1', '4\n5 1 1 5'],
    hidden: ['6\n4 10 3 1 5 9', '3\n1 2 3'],
    editorial: 'This is the standard take-or-skip dynamic program. Track the best value when taking the current slot and when skipping it.',
  }),
  problem({
    sourceId: 'lc-17',
    slug: 'amazon-inventory-emergency-restocking',
    title: 'Warehouse Inventory Emergency Restocking',
    kind: 'restocks',
    statement: 'Inventory changes over days. Whenever stock falls below a threshold after a daily change, emergency restocks add a fixed amount until the threshold is met. Count restocks.',
    inputFormat: 'Line 1: n start threshold restockAmount. Line 2: n daily changes.',
    outputFormat: 'Print the number of emergency restocks.',
    constraints: '1 <= n <= 200000. restockAmount > 0.',
    visible: ['4 10 5 6\n-3 -4 -5 2', '3 2 4 3\n1 -5 -1'],
    hidden: ['5 20 10 5\n-15 -1 -1 -1 -1', '2 0 0 10\n-1 -20'],
    editorial: 'Simulate days. After applying a change, repeatedly add restockAmount while stock is below threshold.',
  }),
  problem({
    sourceId: 'lc-18',
    slug: 'amazon-grid-min-distance-after-flip',
    title: 'Grid Minimum Distance After Flipping One Zero',
    kind: 'gridRadius',
    statement: 'Given a binary grid, flip at most one 0 to 1. Minimize the maximum distance from any 1-cell to its nearest 1-cell in the resulting grid.',
    inputFormat: 'Line 1: r c. Next r lines: binary grid rows.',
    outputFormat: 'Print the minimized maximum nearest-one distance.',
    constraints: '1 <= r,c <= 30 for this practice adaptation.',
    visible: ['2 2\n10\n00', '3 3\n100\n000\n001'],
    hidden: ['3 4\n0000\n0100\n0001', '1 4\n1000'],
    editorial: 'Try each possible flip and measure the farthest nearest-one distance. A production solution can binary search the radius, but brute force is clear for small practice bounds.',
  }),
  problem({
    sourceId: 'lc-20',
    slug: 'amazon-merge-primary-secondary-branches',
    title: 'Merge Primary and Secondary Branches Minimum Conflicts',
    kind: 'lcsConflicts',
    statement: 'Compute minimum conflicting commits when merging primary and secondary branch commit sequences while preserving relative order.',
    inputFormat: 'Line 1: primary branch sequence. Line 2: secondary branch sequence.',
    outputFormat: 'Print the minimum conflict count.',
    constraints: '1 <= length <= 1000.',
    visible: ['axbycz\nabc', 'kitten\nsitting'],
    hidden: ['abcabc\nacbacb', 'xyz\nxyz'],
    editorial: 'The longest common subsequence is the largest clean merge backbone. Commits outside that backbone are counted as conflicts.',
  }),
  problem({
    sourceId: 'lc-22',
    slug: 'amazon-inventory-quality-conversion',
    title: 'Optimal Inventory Quality Conversion Minimum Cost',
    kind: 'weightedMedianCost',
    statement: 'Convert all inventory qualities to one existing quality. Changing item i by one quality point costs cost[i]. Minimize total cost.',
    inputFormat: 'Line 1: n. Line 2: qualities. Line 3: per-unit costs.',
    outputFormat: 'Print the minimum conversion cost.',
    constraints: '1 <= n <= 200000.',
    visible: ['3\n1 3 5\n10 1 10', '4\n2 4 8 10\n1 2 3 4'],
    hidden: ['5\n1 2 3 4 5\n5 4 3 2 1', '2\n100 1\n7 9'],
    editorial: 'The weighted absolute-distance objective is minimized at a weighted median. This reference evaluates existing targets directly for clarity.',
  }),
  problem({
    sourceId: 'lc-24',
    slug: 'amazon-security-unit-relocation',
    title: 'Security Unit Relocation Max Protected Population',
    kind: 'maxProtected',
    statement: 'Place k security units at existing city positions. A unit protects cities within distance radius. Maximize the sum of protected population counted per chosen unit in this adaptation.',
    inputFormat: 'Line 1: n k radius. Line 2: city positions. Line 3: city populations.',
    outputFormat: 'Print the maximum protected population score.',
    constraints: '1 <= n <= 2000. 1 <= k <= n.',
    visible: ['4 1 2\n1 3 6 10\n5 10 20 1', '5 2 1\n1 2 4 7 8\n3 4 5 6 7'],
    hidden: ['3 2 10\n1 5 9\n10 10 10', '4 1 0\n1 2 3 4\n8 1 9 2'],
    editorial: 'Compute the population covered by placing a unit at each existing position, sort scores, and select the best k scores for this independent-score adaptation.',
  }),
  problem({
    sourceId: 'lc-25',
    slug: 'amazon-product-variant-conversion',
    title: 'Product Variant Conversion Minimum Cost',
    kind: 'conversionCost',
    statement: 'Two product variant strings have equal length. Converting position i costs cost[i] if the characters differ. Compute total minimum conversion cost.',
    inputFormat: 'Line 1: source string. Line 2: target string. Line 3: per-position costs.',
    outputFormat: 'Print the total conversion cost.',
    constraints: '1 <= length <= 200000.',
    visible: ['abcde\nabfde\n1 2 3 4 5', 'aaaa\nbbbb\n5 6 7 8'],
    hidden: ['amazon\namzxon\n3 1 4 1 5 9', 'xyz\nxyz\n10 20 30'],
    editorial: 'Positions are independent. Add cost[i] exactly when source[i] differs from target[i].',
  }),
  problem({
    sourceId: 'ai-02',
    slug: 'amazon-debug-moviedb-recommendation',
    title: 'MovieDB Recommendation Debug',
    kind: 'movieScore',
    statement: 'Debug a recommendation rule by choosing the best movie that meets a minimum rating and best matches requested genres.',
    inputFormat: 'Line 1: n minimumRating. Line 2: wanted genres. Next n lines: name rating genres...',
    outputFormat: 'Print the selected movie name or NO_MATCH.',
    constraints: '1 <= n <= 1000.',
    visible: ['3 7\naction comedy\nAlpha 8 action drama\nBeta 9 horror\nGamma 8 action comedy', '2 9\nsci-fi\nLow 8 sci-fi\nHigh 9 drama'],
    hidden: ['2 5\ncomedy\nB 5 comedy\nA 5 comedy', '1 10\naction\nOnly 9 action'],
    editorial: 'Filter by minimum rating, score by rating and genre overlap, and use lexical order as a deterministic tie-breaker.',
  }),
  problem({
    sourceId: 'ai-03',
    slug: 'amazon-debug-scheduled-payments',
    title: 'AI Assist Debug Schedule Payment Backend Bug',
    kind: 'paymentDue',
    statement: 'A payment scheduler should execute only active payments whose due day is not after today. Sum the amounts that should run.',
    inputFormat: 'Line 1: today as an integer day. Line 2: n. Next n lines: dueDay amount activeFlag.',
    outputFormat: 'Print the total due active amount.',
    constraints: '1 <= n <= 100000.',
    visible: ['10\n3\n9 50 1\n11 70 1\n10 20 0', '5\n2\n5 10 1\n4 7 1'],
    hidden: ['1\n2\n0 5 1\n1 6 1', '3\n3\n2 9 0\n3 8 1\n4 100 1'],
    editorial: 'The bug class is usually an off-by-one or missing active filter. Include dueDay <= today and activeFlag == 1.',
  }),
  problem({
    sourceId: 'ai-04',
    slug: 'amazon-debug-user-reset-password',
    title: 'AI Assist Debug User Reset Password',
    kind: 'resetPassword',
    statement: 'Count password reset tokens that are not used, not revoked, and not expired at the current time.',
    inputFormat: 'Line 1: current time. Line 2: n. Next n lines: created ttl used revoked.',
    outputFormat: 'Print the number of valid reset tokens.',
    constraints: '1 <= n <= 100000.',
    visible: ['100\n3\n90 20 0 0\n80 10 0 0\n99 5 1 0', '50\n2\n40 10 0 0\n40 9 0 0'],
    hidden: ['10\n2\n0 10 0 0\n0 10 0 1', '7\n1\n8 5 0 0'],
    editorial: 'A valid reset token must satisfy all state predicates and the inclusive expiration boundary now <= created + ttl.',
  }),
  problem({
    sourceId: 'ai-07',
    slug: 'amazon-debug-issue-comments',
    title: 'Jira Style Issue Comment Platform Debug',
    kind: 'issueComments',
    statement: 'Process comment add/delete events and report the number of remaining comments per issue.',
    inputFormat: 'Line 1: n. Next n lines: ADD or DEL, issue id, comment id.',
    outputFormat: 'Print issue:count lines ordered by issue id.',
    constraints: '1 <= n <= 100000.',
    visible: ['4\nADD A c1\nADD A c2\nDEL A c1\nADD B c3', '3\nADD X a\nDEL X a\nDEL X b'],
    hidden: ['5\nADD B c\nADD A a\nADD A b\nDEL A a\nADD B d', '1\nADD Z z1'],
    editorial: 'Store a set of active comment IDs per issue. Deleting a missing comment should be harmless.',
  }),
  problem({
    sourceId: 'ai-09',
    slug: 'amazon-debug-return-system',
    title: 'Amazon Return System AI Debug',
    kind: 'returnRefund',
    statement: 'Compute approved refund amount. Returns after 30 days or damaged items are rejected. Opened but otherwise eligible items refund half price.',
    inputFormat: 'Line 1: n. Next n lines: daysSincePurchase price damagedFlag openedFlag.',
    outputFormat: 'Print total refund amount.',
    constraints: '1 <= n <= 100000.',
    visible: ['3\n10 100 0 0\n20 80 0 1\n31 50 0 0', '2\n5 60 1 0\n30 40 0 1'],
    hidden: ['1\n30 99 0 0', '3\n1 10 0 1\n2 11 0 1\n3 12 0 0'],
    editorial: 'Apply the policy predicates in the correct order: reject damaged or late returns, then discount opened items.',
  }),
  problem({
    sourceId: 'ai-19',
    slug: 'amazon-debug-django-api-tests',
    title: 'Python Django Backend API Tests Debug',
    kind: 'apiFailures',
    statement: 'A simplified API test runner records expected status, actual status, and latency. Count failed tests.',
    inputFormat: 'Line 1: n. Next n lines: expectedStatus actualStatus latencyMs.',
    outputFormat: 'Print the number of failed tests.',
    constraints: '1 <= n <= 100000.',
    visible: ['3\n200 200 120\n201 500 90\n200 200 700', '2\n404 404 500\n200 200 501'],
    hidden: ['1\n204 204 1', '4\n200 201 1\n200 200 500\n500 500 600\n301 301 20'],
    editorial: 'A test fails if the status code differs or if latency exceeds 500ms. The boundary 500ms itself is allowed.',
  }),
  problem({
    sourceId: 'ai-21',
    slug: 'amazon-debug-wallet-recurring-payments',
    title: 'Wallet App Recurring Payments AI Debug',
    kind: 'recurringWallet',
    statement: 'Recurring payments execute in order while the wallet has enough balance. Report how many were paid and the remaining balance.',
    inputFormat: 'Line 1: n startingBalance. Next n lines: payment amount.',
    outputFormat: 'Print paidCount remainingBalance.',
    constraints: '1 <= n <= 100000.',
    visible: ['3 100\n30\n40\n50', '4 10\n3\n4\n2\n9'],
    hidden: ['1 5\n5', '2 0\n1\n1'],
    editorial: 'Simulate payments in order. A payment either consumes balance and counts as paid, or is skipped when insufficient funds remain.',
  }),
  problem({
    sourceId: 'ai-23',
    slug: 'amazon-debug-issue-activity-logs',
    title: 'AI Coding Debug Issue and Comment Activity Logs',
    kind: 'activityLogs',
    statement: 'Count unique valid entity-action activity records. Invalid actions should be ignored.',
    inputFormat: 'Line 1: n. Next n lines: entityId action.',
    outputFormat: 'Print the number of unique valid activity records.',
    constraints: '1 <= n <= 100000.',
    visible: ['4\nI1 CREATE\nI1 CREATE\nI1 COMMENT\nI2 BAD', '3\nA CLOSE\nB UPDATE\nB DELETE'],
    hidden: ['2\nX COMMENT\nX COMMENT', '1\nZ BAD'],
    editorial: 'Normalize by the pair entityId:action and accept only the supported actions.',
  }),
  problem({
    sourceId: 'ai-rbac',
    slug: 'amazon-debug-banking-rbac',
    title: 'Banking App Role-Based Access Control Debug',
    kind: 'rbac',
    statement: 'Given role permission declarations and access checks, decide whether each check is allowed.',
    inputFormat: 'Line 1: n m. Next n lines: role followed by permissions. Next m lines: role permission.',
    outputFormat: 'Print ALLOW or DENY for each check.',
    constraints: '1 <= n,m <= 100000.',
    visible: ['2 3\nadmin read write\nviewer read\nadmin write\nviewer write\nmissing read', '1 2\nteller deposit withdraw\nteller deposit\nteller audit'],
    hidden: ['2 2\na x\nb y\na y\nb y', '1 1\nroot all\nroot all'],
    editorial: 'Represent each role as a permission set. A missing role or missing permission returns DENY.',
  }),
  problem({
    sourceId: 'ai-26',
    slug: 'amazon-debug-workflow-subissues',
    title: 'Workflow React Django Issue and Sub-Issue Creation Debug',
    kind: 'subIssues',
    statement: 'Process parent-child issue creation records and report how many direct sub-issues each issue has.',
    inputFormat: 'Line 1: n. Next n lines: parentIssue childIssue.',
    outputFormat: 'Print issue:childCount lines ordered by issue id.',
    constraints: '1 <= n <= 100000.',
    visible: ['3\nA B\nA C\nB D', '1\nROOT CHILD'],
    hidden: ['2\nB C\nA B', '3\nX Y\nX Z\nZ Q'],
    editorial: 'Increment the direct child count for each parent and ensure children with no children still appear with count 0.',
  }),
  problem({
    sourceId: 'ai-27',
    slug: 'amazon-debug-movie-review-moderation',
    title: 'Movie Review Moderation and Rate Limiting Debug',
    kind: 'moderation',
    statement: 'Accept reviews unless the user exceeded the per-user limit or the review word is banned.',
    inputFormat: 'Line 1: n perUserLimit. Next n lines: user word.',
    outputFormat: 'Print the number of accepted reviews.',
    constraints: '1 <= n <= 100000.',
    visible: ['5 2\nu1 good\nu1 nice\nu1 great\nu2 spam\nu2 ok', '3 1\na ok\na ok\nb scam'],
    hidden: ['1 1\nx abuse', '4 3\nu a\nu b\nu c\nu d'],
    editorial: 'Check banned content first and enforce a counter per user for accepted reviews only.',
  }),
];

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const sourceIds = new Set(manifest.items.map((item) => item.sourceId));
  if (definitions.length !== 27) {
    throw new Error(`Expected 27 problem definitions, got ${definitions.length}`);
  }
  for (const definition of definitions) {
    if (!sourceIds.has(definition.sourceId)) {
      throw new Error(`Unknown source id in generator: ${definition.sourceId}`);
    }
  }

  for (const definition of definitions) {
    const problemDir = path.join(PROBLEMS_DIR, definition.slug);
    fs.mkdirSync(path.join(problemDir, 'starter-code'), { recursive: true });
    fs.writeFileSync(path.join(problemDir, 'problem.yaml'), writeProblemYaml(definition));
    fs.writeFileSync(path.join(problemDir, 'editorial.md'), `${definition.editorial}\n`);
    for (const [language, code] of Object.entries(starterCode)) {
      fs.writeFileSync(
        path.join(problemDir, 'starter-code', starterFile[language]),
        code,
      );
    }
    writeTestFiles(problemDir, 'visible', definition.visibleTests);
    writeTestFiles(problemDir, 'hidden', definition.hiddenTests);
  }

  console.log(`Generated ${definitions.length} Amazon OA practice problem(s)`);
}

main();
