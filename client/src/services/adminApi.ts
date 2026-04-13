import api from './api';
import type {
  AdminStats,
  ExamWithProblems,
  ProblemWithTestCases,
  LeaderboardEntry,
  RunLog,
  ProblemView,
  PaginationParams,
  PaginatedResponse,
  AdminUser,
  AdminSubmission,
  AdminScore,
  AdminAutoSave,
  ProblemRow,
  TestCaseRow,
  UserExamDetail,
  CreateProblemPayload,
  UpdateProblemPayload,
  CreateUserPayload,
  UpdateUserPayload,
  CreateTestCasePayload,
  UpdateTestCasePayload,
  AggregatedScore,
} from '../types/admin';
import type { Exam } from '../types';

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export async function listExams(
  pagination?: PaginationParams,
): Promise<PaginatedResponse<ExamWithProblems>> {
  const { data } = await api.get<PaginatedResponse<ExamWithProblems>>(
    '/admin/exams',
    { params: { ...pagination } },
  );
  return data;
}

// Cached exam list for filter dropdowns - fetched once per session.
// Call invalidateCachedExams() after creating/deleting an exam to force a refresh.
let _examListCache: Promise<ExamWithProblems[]> | null = null;

export function invalidateCachedExams() {
  _examListCache = null;
}

export function getCachedExams(): Promise<ExamWithProblems[]> {
  if (!_examListCache) {
    _examListCache = listExams({ limit: 100 })
      .then((r) => r.data)
      .catch((e) => {
        _examListCache = null;
        throw e;
      });
  }
  return _examListCache;
}

export async function getExam(id: number): Promise<ExamWithProblems> {
  const { data } = await api.get<ExamWithProblems>(`/admin/exams/${id}`);
  return data;
}

export async function createExam(
  payload: Omit<Exam, 'id'> & { problemIds?: number[] },
): Promise<ExamWithProblems> {
  const { data } = await api.post<ExamWithProblems>('/admin/exams', payload);
  return data;
}

export async function updateExam(
  id: number,
  payload: Partial<Omit<Exam, 'id'>>,
): Promise<ExamWithProblems> {
  const { data } = await api.put<ExamWithProblems>(
    `/admin/exams/${id}`,
    payload,
  );
  return data;
}

export async function deleteExam(id: number): Promise<void> {
  await api.delete(`/admin/exams/${id}`);
}

export async function duplicateExam(
  id: number,
  title: string,
  startTime: string,
  endTime: string,
): Promise<ExamWithProblems> {
  const { data } = await api.post<ExamWithProblems>(
    `/admin/exams/${id}/duplicate`,
    {
      title,
      startTime,
      endTime,
    },
  );
  return data;
}

// ─── Problems ─────────────────────────────────────────────────────────────────

export async function listExamProblems(
  examId: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<ProblemWithTestCases>> {
  const { data } = await api.get<PaginatedResponse<ProblemWithTestCases>>(
    `/admin/exams/${examId}/problems`,
    {
      params: { ...pagination },
    },
  );
  return data;
}

export async function getProblem(id: number): Promise<ProblemWithTestCases> {
  const { data } = await api.get<ProblemWithTestCases>(`/admin/problems/${id}`);
  return data;
}

export async function createProblem(
  payload: CreateProblemPayload,
): Promise<ProblemWithTestCases> {
  const { data } = await api.post<ProblemWithTestCases>(
    '/admin/problems',
    payload,
  );
  return data;
}

export async function updateProblem(
  id: number,
  payload: UpdateProblemPayload,
): Promise<ProblemWithTestCases> {
  const { data } = await api.put<ProblemWithTestCases>(
    `/admin/problems/${id}`,
    payload,
  );
  return data;
}

export async function deleteProblem(id: number): Promise<void> {
  await api.delete(`/admin/problems/${id}`);
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(
  examId: number,
  options?: { qaRoleOptIn?: boolean },
): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>(
    `/admin/leaderboard/${examId}`,
    {
      params: options?.qaRoleOptIn ? { qaRoleOptIn: 'true' } : {},
    },
  );
  return data;
}

export async function getLeaderboardLive(
  examId: number,
  options?: { qaRoleOptIn?: boolean },
): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>(
    `/admin/leaderboard/${examId}/live`,
    {
      params: options?.qaRoleOptIn ? { qaRoleOptIn: 'true' } : {},
    },
  );
  return data;
}

export async function refreshLeaderboard(examId: number): Promise<void> {
  await api.post(`/admin/leaderboard/${examId}/refresh`);
}

// ─── All Problems (cross-exam) ───────────────────────────────────────────────

export async function listAllProblems(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<ProblemRow>> {
  const params = { ...(examId ? { examId } : {}), ...pagination };
  const { data } = await api.get<PaginatedResponse<ProblemRow>>(
    '/admin/all-problems',
    { params },
  );
  return data;
}

// ─── All Test Cases (cross-problem) ──────────────────────────────────────────

export async function listAllTestCases(
  problemId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<TestCaseRow>> {
  const params = { ...(problemId ? { problemId } : {}), ...pagination };
  const { data } = await api.get<PaginatedResponse<TestCaseRow>>(
    '/admin/all-testcases',
    { params },
  );
  return data;
}

export async function getTestCase(id: number): Promise<TestCaseRow> {
  const { data } = await api.get<TestCaseRow>(`/admin/testcases/${id}`);
  return data;
}

export async function createTestCase(
  payload: CreateTestCasePayload,
): Promise<TestCaseRow> {
  const { data } = await api.post<TestCaseRow>('/admin/testcases', payload);
  return data;
}

export async function updateTestCase(
  id: number,
  payload: UpdateTestCasePayload,
): Promise<TestCaseRow> {
  const { data } = await api.put<TestCaseRow>(
    `/admin/testcases/${id}`,
    payload,
  );
  return data;
}

export async function deleteTestCase(id: number): Promise<void> {
  await api.delete(`/admin/testcases/${id}`);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function listUsers(
  pagination?: PaginationParams,
  options?: { qaRoleOptIn?: boolean },
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', {
    params: {
      ...pagination,
      ...(options?.qaRoleOptIn ? { qaRoleOptIn: 'true' } : {}),
    },
  });
  return data;
}

export async function getUser(id: number): Promise<AdminUser> {
  const { data } = await api.get<AdminUser>(`/admin/users/${id}`);
  return data;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>('/admin/users', payload);
  return data;
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<AdminUser> {
  const { data } = await api.put<AdminUser>(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export async function listSubmissions(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<AdminSubmission>> {
  const params = { ...(examId ? { examId } : {}), ...pagination };
  const { data } = await api.get<PaginatedResponse<AdminSubmission>>(
    '/admin/submissions',
    { params },
  );
  return data;
}

export async function getSubmission(id: number): Promise<AdminSubmission> {
  const { data } = await api.get<AdminSubmission>(`/admin/submissions/${id}`);
  return data;
}

export async function deleteSubmission(id: number): Promise<void> {
  await api.delete(`/admin/submissions/${id}`);
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export async function listAggregatedScores(
  examId?: number,
  pagination?: PaginationParams,
  options?: { qaRoleOptIn?: boolean },
): Promise<PaginatedResponse<AggregatedScore>> {
  const params = {
    ...(examId ? { examId } : {}),
    ...pagination,
    ...(options?.qaRoleOptIn ? { qaRoleOptIn: 'true' } : {}),
  };
  const { data } = await api.get<PaginatedResponse<AggregatedScore>>(
    '/admin/scores/aggregated',
    { params },
  );
  return data;
}

export async function getScoresByUserExam(
  userId: number,
  examId: number,
): Promise<AdminScore[]> {
  const { data } = await api.get<AdminScore[]>('/admin/scores/by-user-exam', {
    params: { userId, examId },
  });
  return data;
}

export async function listScores(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<AdminScore>> {
  const params = { ...(examId ? { examId } : {}), ...pagination };
  const { data } = await api.get<PaginatedResponse<AdminScore>>(
    '/admin/scores',
    { params },
  );
  return data;
}

export async function getScore(id: number): Promise<AdminScore> {
  const { data } = await api.get<AdminScore>(`/admin/scores/${id}`);
  return data;
}

export async function createScore(
  payload: Record<string, unknown>,
): Promise<AdminScore> {
  const { data } = await api.post<AdminScore>('/admin/scores', payload);
  return data;
}

export async function updateScore(
  id: number,
  payload: Record<string, unknown>,
): Promise<AdminScore> {
  const { data } = await api.put<AdminScore>(`/admin/scores/${id}`, payload);
  return data;
}

export async function deleteScore(id: number): Promise<void> {
  await api.delete(`/admin/scores/${id}`);
}

// ─── Analytics & User Detail ─────────────────────────────────────────────────

export async function getUserExamDetail(
  userId: number,
  examId: number,
): Promise<UserExamDetail> {
  const { data } = await api.get<UserExamDetail>('/admin/user-exam-detail', {
    params: { userId, examId },
  });
  return data;
}

export interface ProblemAnalytics {
  problemId: number;
  title: string;
  totalAttempts: number;
  uniqueUsers: number;
  acceptedCount: number;
  acceptRate: number;
}

export async function getProblemAnalytics(
  examId: number,
): Promise<ProblemAnalytics[]> {
  const { data } = await api.get<ProblemAnalytics[]>(
    '/admin/problem-analytics',
    {
      params: { examId },
    },
  );
  return data;
}

// ─── AutoSave ────────────────────────────────────────────────────────────────

export async function listAutoSaves(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<AdminAutoSave>> {
  const params = { ...(examId ? { examId } : {}), ...pagination };
  const { data } = await api.get<PaginatedResponse<AdminAutoSave>>(
    '/admin/autosaves',
    { params },
  );
  return data;
}

export async function getAutoSave(id: number): Promise<AdminAutoSave> {
  const { data } = await api.get<AdminAutoSave>(`/admin/autosaves/${id}`);
  return data;
}

export async function deleteAutoSave(id: number): Promise<void> {
  await api.delete(`/admin/autosaves/${id}`);
}

// ─── Run Logs ─────────────────────────────────────────────────────────────────

export async function listRunLogs(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<RunLog>> {
  const params = { ...(examId && { examId }), ...pagination };
  const { data } = await api.get<PaginatedResponse<RunLog>>('/admin/run-logs', {
    params,
  });
  return data;
}

// ─── Problem Views ────────────────────────────────────────────────────────────

export async function listProblemViews(
  examId?: number,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<ProblemView>> {
  const params = { ...(examId && { examId }), ...pagination };
  const { data } = await api.get<PaginatedResponse<ProblemView>>(
    '/admin/problem-views',
    { params },
  );
  return data;
}

// ─── Problem Assignment ───────────────────────────────────────────────────────

export async function assignProblemToExam(
  problemId: number,
  examId: number,
  displayOrder: number,
): Promise<ProblemWithTestCases> {
  const { data } = await api.patch<ProblemWithTestCases>(
    `/admin/problems/${problemId}/assign-exam`,
    {
      examId,
      displayOrder,
    },
  );
  return data;
}

export async function unassignProblemFromExam(
  problemId: number,
  examId: number,
): Promise<void> {
  await api.delete(`/admin/problems/${problemId}/assign-exam/${examId}`);
}
