// load-tests/k6/main.js
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { getConfig, THRESHOLDS } from './config.js';
import { generateStudents } from './helpers/data-gen.js';
import {
  getUpcoming, register, login, enroll, fetchProblems, submitMCQ,
  adminLogin, createExam, createProblem, qaOptIn,
} from './helpers/api.js';
import { htmlReport, textSummary } from './helpers/report.js';

const config = getConfig();

// SharedArray runs once at init time - all VUs share this array.
// generateStudents uses Date.now() as runId → unique credentials per run.
const students = new SharedArray('students', () => generateStudents(config.vus));

export const options = {
  scenarios: {
    spike: {
      executor:    'per-vu-iterations',
      vus:         config.vus,
      iterations:  1,
      maxDuration: '10m',
    },
  },
  thresholds: THRESHOLDS,
};

// ─── setup(): runs once before any VU starts ─────────────────────────────────
export function setup() {
  // Warm up the server (avoids cold-start distortion)
  for (let i = 0; i < 5; i++) {
    getUpcoming(config.baseUrl);
  }

  // Admin login
  const loginRes = adminLogin(config.baseUrl, config.adminEmail, config.adminPass);
  if (loginRes.status !== 201) {
    throw new Error(`Admin login failed: ${loginRes.status} ${loginRes.body}`);
  }
  const adminToken = loginRes.json('accessToken');

  // Create a fresh exam for this run
  const now = new Date();
  const examRes = createExam(config.baseUrl, adminToken, {
    title:            `PerfTest-${now.getTime()}`,
    startTime:        new Date(now.getTime() - 60_000).toISOString(), // 1 min ago → active
    endTime:          new Date(now.getTime() + 3 * 60 * 60_000).toISOString(), // 3h window
    durationMinutes:  180,
    isActive:         true,
    allowedLanguages: [71],
  });
  if (examRes.status !== 201) {
    throw new Error(`Create exam failed: ${examRes.status} ${examRes.body}`);
  }
  const examId = examRes.json('id');

  // Create 5 MCQ problems linked to the exam
  const problemIds = [];
  for (let i = 0; i < 5; i++) {
    const probRes = createProblem(config.baseUrl, adminToken, {
      examId,
      title:         `MCQ Q${i + 1}`,
      description:   `Performance test question ${i + 1}`,
      questionType:  'mcq',
      isMultiSelect: false,
      maxScore:      10,
      difficulty:    'easy',
      displayOrder:  i + 1,
      mcqOptions: [
        { text: 'Option A', isCorrect: true  },
        { text: 'Option B', isCorrect: false },
        { text: 'Option C', isCorrect: false },
        { text: 'Option D', isCorrect: false },
      ],
    });
    if (probRes.status !== 201) {
      throw new Error(`Create problem ${i + 1} failed: ${probRes.status} ${probRes.body}`);
    }
    problemIds.push(probRes.json('id'));
  }

  return { examId, problemIds, adminToken };
}

// ─── default(): runs once per VU ─────────────────────────────────────────────
export default function (data) {
  // __VU is 1-based; students array is 0-based
  const student = students[__VU - 1];

  // Step 1: Discover active exam
  const upcomingRes = getUpcoming(config.baseUrl);
  check(upcomingRes, {
    'upcoming: 200':    r => r.status === 200,
    'upcoming: no 429': r => r.status !== 429,
  });
  // Abort VU if server is unreachable (status 0 = connection refused/timeout)
  if (upcomingRes.status === 0) return;

  // Divide VUs into three QA opt-in groups (~40 VUs each at 120 total):
  //   vuGroup 1 (__VU % 3 === 1): register with qaRoleOptIn: true in the body
  //   vuGroup 2 (__VU % 3 === 2): register normally, call PATCH /user/qa-opt-in after login
  //   vuGroup 0 (__VU % 3 === 0): standard flow - no QA opt-in
  const vuGroup = __VU % 3;

  // Step 2: Register (group 1 passes qaRoleOptIn: true in the registration body)
  const studentWithFlag = vuGroup === 1
    ? { ...student, qaRoleOptIn: true }
    : student;
  const registerRes = register(config.baseUrl, studentWithFlag);
  check(registerRes, {
    'register: 201':    r => r.status === 201,
    'register: no 429': r => r.status !== 429,
  });
  if (registerRes.status === 0) return;

  // Step 3: Login
  const loginRes = login(config.baseUrl, student.email, student.password);
  check(loginRes, {
    'login: 201':    r => r.status === 201,
    'login: token':  r => r.status === 201 && Boolean(r.json('accessToken')),
    'login: no 429': r => r.status !== 429,
  });
  if (loginRes.status === 0) return;
  const token = loginRes.json('accessToken');
  // Login succeeded at HTTP level but no token (e.g. wrong credentials) - abort
  if (!token) return;

  // Step 3b: group 2 - opt in via the dedicated PATCH endpoint after login
  if (vuGroup === 2) {
    const optInRes = qaOptIn(config.baseUrl, token, true);
    check(optInRes, {
      'qa-opt-in: 200':    r => r.status === 200,
      'qa-opt-in: no 429': r => r.status !== 429,
    });
  }

  // Step 4: Enroll in exam
  const enrollRes = enroll(config.baseUrl, data.examId, token);
  check(enrollRes, {
    'enroll: 201':    r => r.status === 201,
    'enroll: no 429': r => r.status !== 429,
  });
  if (enrollRes.status === 0) return;

  // Step 5: Fetch problems (options are shuffled per request - read IDs dynamically)
  const problemsRes = fetchProblems(config.baseUrl, data.examId, token);
  if (problemsRes.status === 0) return;
  const problems = problemsRes.json();
  check(problemsRes, {
    'problems: 200':         r => r.status === 200,
    'problems: has items':   () => problems.length > 0,
    'problems: mcq options': () => problems.some(p => p.mcqOptions !== null),
    'problems: no 429':      r => r.status !== 429,
  });
  if (!problems || problems.length === 0) return;

  // Think time: simulate student reading + selecting answers
  sleep(randomIntBetween(5, config.thinkTime));

  // Step 6: Submit - pick first option for each problem
  const answers = problems.map(p => ({
    problemId:         p.id,
    selectedOptionIds: [p.mcqOptions[0].id],
  }));
  const submitRes = submitMCQ(config.baseUrl, data.examId, token, answers);
  check(submitRes, {
    'submit: 201':     r => r.status === 201,
    'submit: results': r => r.status === 201 && Array.isArray(r.json('results')),
    'submit: no 429':  r => r.status !== 429,
  });
}

// ─── teardown(): intentionally left empty - exam is kept for post-run review ──
export function teardown(_data) {
  // Exam is preserved so results can be inspected in the admin panel after the test.
  // To delete it manually: DELETE /api/admin/exams/:id
}

// ─── handleSummary(): write HTML + JSON reports ───────────────────────────────
export function handleSummary(data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    // Docker mounts load-tests/ → /home/k6, so 'reports/' writes to load-tests/reports/ on host
    [`reports/summary-${ts}.html`]: htmlReport(data),
    [`reports/results-${ts}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
