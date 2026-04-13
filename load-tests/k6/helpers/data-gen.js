// load-tests/k6/helpers/data-gen.js
// Generates unique student payloads per run using a timestamp prefix.
// runId is set once at script init time (SharedArray context) - all VUs share it.

export function generateStudents(count) {
  const runId = Date.now(); // 13-digit ms timestamp
  return Array.from({ length: count }, (_, i) => {
    const idx = String(i + 1).padStart(3, "0");
    return {
      rollNumber: `p${runId}${idx}`, // max 17 chars - within 20-char limit
      firstName: "Perf",
      lastName: `User${idx}`,
      email: `p${runId}${idx}@perftest.io`,
      password: "Perf@1234",
    };
  });
}
