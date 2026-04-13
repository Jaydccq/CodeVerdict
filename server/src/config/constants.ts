// Judge0 status IDs - https://ce.judge0.com/statuses
export const JUDGE0_STATUS_MAP: Record<number, string> = {
  1: 'in_queue',
  2: 'processing',
  3: 'accepted',
  4: 'wrong_answer',
  5: 'time_limit_exceeded',
  6: 'compilation_error',
  7: 'runtime_error_sigsegv',
  8: 'runtime_error_sigxfsz',
  9: 'runtime_error_sigfpe',
  10: 'runtime_error_sigabrt',
  11: 'runtime_error_nzec',
  12: 'runtime_error_other',
  13: 'internal_error',
  14: 'exec_format_error',
};

// Terminal statuses (not still processing)
export const TERMINAL_STATUS_IDS = new Set([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
]);

export const LANGUAGE_MAP: Record<string, number[]> = {
  c: [103, 50, 49, 48, 75],
  cpp: [105, 54, 53, 52, 76],
  java: [91, 62],
  python: [113, 109, 71, 70],
  javascript: [102, 97, 63],
  typescript: [74],
  kotlin: [78],
  rust: [73],
  go: [60],
  ruby: [72],
  csharp: [51],
  swift: [83],
};

export const VALID_LANGUAGE_IDS = new Set(Object.values(LANGUAGE_MAP).flat());

export const POLL_INTERVAL_MS = 1000;
export const MAX_POLL_ATTEMPTS = 20;
