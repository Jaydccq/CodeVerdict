import type { Problem } from './index';

export interface AdminStats {
  totalExams: number;
  activeExams: { id: number; title: string }[];
  totalStudents: number;
  totalSubmissions: number;
}

export interface ExamWithProblems {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  allowedLanguages: number[];
  isActive: boolean;
  createdAt: string;
  problems: ProblemWithTestCases[];
}

export interface ProblemWithTestCases extends Problem {
  testCases: TestCaseRow[];
}

export interface TestCaseRow {
  _key: string;
  id?: number;
  input: string;
  expectedOutput: string;
  isVisible: boolean;
  displayOrder: number;
  problemId?: number;
  problem?: { id: number; title: string; exam?: { id: number; title: string } };
}

export interface LeaderboardEntry {
  examId: number;
  userId: number;
  rollNumber: string;
  firstName: string;
  lastName: string;
  solvedCount: number;
  totalScore: number;
  totalPenaltyTime: number;
  lastSolvedAt: string | null;
  problemScores: Record<
    string,
    { score: number; solved: boolean; attempts: number }
  >;
}

export type ExamStatus = 'active' | 'upcoming' | 'ended';

export function getExamStatus(exam: {
  isActive: boolean;
  startTime: string;
  endTime: string;
}): ExamStatus {
  const now = Date.now();
  const start = new Date(exam.startTime).getTime();
  const end = new Date(exam.endTime).getTime();
  if (exam.isActive && now >= start && now <= end) return 'active';
  if (start > now) return 'upcoming';
  return 'ended';
}

export interface AdminUser {
  id: number;
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  phoneNumber?: string;
  role: 'STUDENT' | 'ADMIN';
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AdminSubmission {
  id: number;
  userId: number;
  problemId: number;
  examId: number;
  code: string | null;
  language: string | null;
  languageId: number | null;
  verdict: string;
  score: number;
  passedTestCases: number | null;
  totalTestCases: number | null;
  selectedOptionIds: number[] | null;
  testResults: Array<{
    index: number;
    passed: boolean;
    status: string;
    statusId: number;
    time: string | null;
    wallTime: string | null;
    memory: number | null;
    exitCode: number | null;
  }> | null;
  submittedAt: string;
  user?: { firstName: string; lastName: string; rollNumber: string };
  problem?: {
    id: number;
    title: string;
    questionType?: 'coding' | 'mcq';
    mcqOptions?: Array<{ id: number; text: string; isCorrect: boolean }>;
  };
  exam?: { title: string };
}

export interface AdminScore {
  id: number;
  userId: number;
  problemId: number;
  examId: number;
  bestScore: number;
  bestSubmissionId: number | null;
  totalAttempts: number;
  wrongAttempts: number;
  firstSolvedAt: string | null;
  user?: { firstName: string; lastName: string; rollNumber: string };
  problem?: { title: string };
  exam?: { title: string };
}

export interface AggregatedScore {
  userId: number;
  examId: number;
  totalScore: number;
  totalAttempts: number;
  totalWrongAttempts: number;
  problemCount: number;
  solvedCount: number;
  earliestSolvedAt: string | null;
  user: { rollNumber: string; firstName: string; lastName: string };
  exam: { title: string };
}

export interface RunLog {
  id: number;
  userId: number;
  problemId: number;
  examId: number;
  sourceCode: string;
  language: string;
  languageId: number;
  inputType: 'sample' | 'custom';
  customInput: string | null;
  results: Array<{
    index: number;
    passed: boolean;
    status: string;
    time: number | null;
    memory: number | null;
  }> | null;
  executedAt: string;
}

export interface ProblemView {
  id: number;
  userId: number;
  problemId: number;
  examId: number;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
}

export interface UserExamDetail {
  user: { id: number; rollNumber: string; firstName: string; lastName: string };
  exam: { id: number; title: string };
  problems: Array<{
    id: number;
    title: string;
    displayOrder: number;
    maxScore: number;
    questionType?: 'coding' | 'mcq';
    mcqOptions?: Array<{
      id: number;
      text: string;
      imageData?: string | null;
      isCorrect: boolean;
    }> | null;
  }>;
  scores: AdminScore[];
  submissions: AdminSubmission[];
  runLogs: RunLog[];
  problemViews: ProblemView[];
  summary: {
    totalProblems: number;
    solved: number;
    attempted: number;
    neverAttempted: number;
  };
}

export interface AdminAutoSave {
  id: number;
  userId: number;
  examId: number;
  codeState: Record<string, Record<string, string>>;
  updatedAt: string;
  user?: { firstName: string; lastName: string; rollNumber: string };
  exam?: { title: string };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProblemRow {
  id: number;
  title: string;
  displayOrder: number;
  difficulty: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  maxScore: number;
  questionType?: 'coding' | 'mcq';
  testCases?: unknown[];
  examId?: number;
}

export interface CreateProblemPayload {
  title?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  difficulty?: string;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  maxScore?: number;
  starterCode?: Record<string, string> | null;
  referenceSolutionCode?: string | null;
  referenceSolutionLanguageId?: number | null;
  questionType?: 'coding' | 'mcq';
  isMultiSelect?: boolean;
  questionImageData?: string | null;
  mcqOptions?: Array<{ text: string; imageData?: string; isCorrect: boolean }>;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isVisible?: boolean;
    displayOrder: number;
  }>;
  examId?: number;
  displayOrder?: number;
}

export type UpdateProblemPayload = Partial<CreateProblemPayload>;

export interface CreateUserPayload {
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode?: string;
  phoneNumber?: string;
  role?: 'STUDENT' | 'ADMIN';
}

export interface UpdateUserPayload extends Partial<
  Omit<CreateUserPayload, 'password'>
> {
  password?: string;
}

export interface CreateTestCasePayload {
  problemId: number;
  input: string;
  expectedOutput: string;
  isVisible?: boolean;
  displayOrder?: number;
}

export type UpdateTestCasePayload = Partial<
  Omit<CreateTestCasePayload, 'problemId'>
>;
