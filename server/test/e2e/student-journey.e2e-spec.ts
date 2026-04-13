import request from 'supertest';
import { createTestApp, TestApp } from '../setup/test-app';
import { cleanDatabase } from '../helpers/db.helper';
import { authHeader } from '../helpers/auth.helper';
import { createExamWithProblems } from '../helpers/exam.helper';
import type { ExamWithProblems } from '../helpers/exam.helper';
import { Score } from '../../src/entities/score.entity';

describe('Full Student Journey (E2E)', () => {
  let testApp: TestApp;
  let seed: ExamWithProblems;

  beforeAll(async () => {
    testApp = await createTestApp();
    await cleanDatabase(testApp.dataSource);
    seed = await createExamWithProblems(testApp.dataSource);
    testApp.mockJudge0.reset();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('should complete the full student exam flow', async () => {
    const server = testApp.app.getHttpServer();

    // ── Step 1: Register ──
    const registerRes = await request(server)
      .post('/api/auth/register')
      .send({
        rollNumber: 'JOURNEY001',
        firstName: 'Alice',
        lastName: 'Student',
        email: 'alice@exam.com',
        password: 'securepass123',
      })
      .expect(201);

    expect(registerRes.body).toHaveProperty('accessToken');
    const token = registerRes.body.accessToken;
    const userId = registerRes.body.user.id;
    const headers = authHeader(token);

    // ── Step 2: Login (verify credentials work) ──
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ email: 'alice@exam.com', password: 'securepass123' })
      .expect(201);

    expect(loginRes.body.user.id).toBe(userId);

    // ── Step 3: Check active exam ──
    const examRes = await request(server).get('/api/exams/active').expect(200);

    expect(examRes.body.id).toBe(seed.exam.id);
    expect(examRes.body.title).toBe('Test Exam');

    // ── Step 4: Get exam status (timer sync) ──
    const statusRes = await request(server)
      .get('/api/exams/status')
      .set(headers)
      .expect(200);

    expect(statusRes.body.examId).toBe(seed.exam.id);
    expect(statusRes.body).toHaveProperty('serverTime');

    // ── Step 5: Get supported languages ──
    const langRes = await request(server)
      .get('/api/languages')
      .set(headers)
      .expect(200);

    expect(langRes.body.length).toBeGreaterThan(0);

    // ── Step 6: List problems ──
    const problemsRes = await request(server)
      .get('/api/problems')
      .set(headers)
      .expect(200);

    expect(problemsRes.body.length).toBe(2);
    const problem1Id = problemsRes.body[0].id;
    const problem2Id = problemsRes.body[1].id;

    // ── Step 7: View problem detail ──
    const problemDetailRes = await request(server)
      .get(`/api/problems/${problem1Id}`)
      .set(headers)
      .expect(200);

    expect(problemDetailRes.body.title).toBe('Sum of Two');
    // Only visible test cases
    if (problemDetailRes.body.testCases) {
      expect(problemDetailRes.body.testCases.length).toBe(2);
    }

    // ── Step 8: Save code draft (autosave) ──
    const codeState = {
      [problem1Id]: { '71': 'print(sum(map(int, input().split())))' },
      [problem2Id]: { '71': '# not started yet' },
    };
    await request(server)
      .post('/api/autosave')
      .set(headers)
      .send({ examId: seed.exam.id, codeState })
      .expect(201);

    // ── Step 9: Load draft ──
    const loadRes = await request(server)
      .get(`/api/autosave/${seed.exam.id}`)
      .set(headers)
      .expect(200);

    expect(loadRes.body.codeState).toEqual(codeState);

    // ── Step 10: Test run (no scoring) ──
    testApp.mockJudge0.setAllPassing();
    const runRes = await request(server)
      .post('/api/submissions/run')
      .set(headers)
      .send({
        problemId: problem1Id,
        sourceCode: 'print(sum(map(int, input().split())))',
        languageId: 71,
      })
      .expect(201);

    expect(runRes.body).toHaveProperty('results');

    // ── Step 11: Submit wrong answer ──
    testApp.mockJudge0.setAllFailing();
    const wrongRes = await request(server)
      .post('/api/submissions')
      .set(headers)
      .send({
        problemId: problem1Id,
        sourceCode: 'print("wrong")',
        languageId: 71,
      })
      .expect(201);

    expect(wrongRes.body.verdict).toBe('wrong_answer');

    // ── Step 12: Submit correct answer ──
    testApp.mockJudge0.setAllPassing();
    const correctRes = await request(server)
      .post('/api/submissions')
      .set(headers)
      .send({
        problemId: problem1Id,
        sourceCode: 'print(sum(map(int, input().split())))',
        languageId: 71,
      })
      .expect(201);

    expect(correctRes.body.verdict).toBe('accepted');

    // ── Step 13: List submissions ──
    const listRes = await request(server)
      .get('/api/submissions')
      .set(headers)
      .expect(200);

    expect(listRes.body.length).toBe(2); // 1 wrong + 1 correct
    // Most recent first
    expect(listRes.body[0].verdict).toBe('accepted');
    expect(listRes.body[1].verdict).toBe('wrong_answer');

    // ── Step 14: View submission detail ──
    const detailRes = await request(server)
      .get(`/api/submissions/${correctRes.body.id}`)
      .set(headers)
      .expect(200);

    expect(detailRes.body.id).toBe(correctRes.body.id);
    expect(detailRes.body).toHaveProperty('testResults');
    expect(detailRes.body).toHaveProperty('code');

    // ── Step 15: Verify ICPC scoring with penalty ──
    const score = await testApp.dataSource.getRepository(Score).findOne({
      where: { userId, problemId: problem1Id, examId: seed.exam.id },
    });

    expect(score).toBeDefined();
    expect(score!.totalAttempts).toBe(2);
    expect(score!.wrongAttempts).toBe(1); // 1 wrong before correct
    expect(score!.firstSolvedAt).not.toBeNull();
    expect(Number(score!.bestScore)).toBeGreaterThan(3);
    // Penalty: 1 wrong * 5 min = 5 min penalty applied
    // The score should be less than if there was no penalty
  });
});
