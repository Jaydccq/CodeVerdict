export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  role: 'STUDENT' | 'ADMIN';
  metadata?: Record<string, string | number | boolean>;
}

export interface Exam {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  allowedLanguages: number[];
  isActive?: boolean;
}

export interface McqOption {
  id: string;
  text: string;
  imageData?: string | null;
  isCorrect?: boolean;
}

export interface Problem {
  id: number;
  examId: number;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  difficulty?: string;
  displayOrder: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  maxScore?: number;
  starterCode?: Record<string, string> | null;
  referenceSolutionCode?: string | null;
  referenceSolutionLanguageId?: number | null;
  questionType?: 'coding' | 'mcq';
  isMultiSelect?: boolean;
  questionImageData?: string | null;
  mcqOptions?: McqOption[] | null;
}

export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  points: number;
}

export interface Submission {
  id: number;
  userId: number;
  problemId: number;
  examId: number;
  sourceCode: string;
  languageId: number;
  verdict: string;
  score: number;
  passedTests: number;
  totalTests: number;
  results: JudgeResult[];
  createdAt: string;
}

export interface JudgeResult {
  index: number;
  passed: boolean;
  status: string;
  statusId: number;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
  expectedOutput?: string | null;
  input?: string | null;
}

export interface RunResult {
  results: JudgeResult[];
  customResult?: {
    stdout: string | null;
    stderr: string | null;
    compileOutput: string | null;
    status: string;
    time: number | null;
    memory: number | null;
    expectedOutput?: string | null;
    expectedOutputError?: string | null;
  };
}

export interface MyProgress {
  examId: number;
  totalProblems: number;
  solvedProblems: number;
  allSolved: boolean;
  solvedProblemIds: number[];
  mcqSectionSubmitted: boolean;
  mcqProblemCount: number;
}

export interface McqSubmitResult {
  submitted: boolean;
  totalScore: number;
}

export interface ExamStatus {
  examId: number;
  examEndTime: string;
  serverTime: string;
  isActive: boolean;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data: unknown;
  time: number;
  headers: Record<string, string>;
}

export interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  label: string;
  auth: boolean;
  bodyTemplate?: Record<string, unknown>;
}

export interface LanguageConfig {
  id: number;
  name: string;
  monacoLang: string;
  boilerplate: string;
}

export interface PracticeLanguage {
  key: string;
  label: string;
  languageId: number;
  monacoLanguage: string;
}

export interface PracticeSample {
  input: string;
  output: string;
  explanation?: string;
}

export interface PracticeDebugWorkspaceFile {
  path: string;
  content: string;
  editable: boolean;
}

export interface PracticeDebugWorkspace {
  stack: 'node';
  runnerProfile: string;
  entryFiles: string[];
  editablePaths: string[];
  files: PracticeDebugWorkspaceFile[];
}

export interface PracticeDebugWorkspaceDraft {
  editedFiles: Record<string, string>;
  updatedAt: string | null;
}

export interface PracticeProblemListItem {
  slug: string;
  questionType: 'algorithm' | 'debug-workspace';
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
  supportedLanguages: PracticeLanguage[];
}

export interface PracticeProblem {
  questionType: 'algorithm' | 'debug-workspace';
  slug: string;
  source?: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  editorial?: string;
  samples: PracticeSample[];
  supportedLanguages: PracticeLanguage[];
  starterCode: Record<string, string>;
  timeLimitMs: number;
  memoryLimitKb: number;
  debugWorkspace?: PracticeDebugWorkspace;
}

export interface PracticeRunSampleItem {
  index: number;
  passed: boolean;
  status: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
}

export interface PracticeRunSampleResult {
  results: PracticeRunSampleItem[];
}

export interface PracticeRunCustomResult {
  status: string;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
}

export interface PracticeSubmitResult {
  id: number;
  verdict: string;
  passedCount: number;
  totalCount: number;
  failureType: string | null;
  visibleFailure: PracticeRunSampleItem | null;
  hiddenFailure: {
    message: string;
    failureType: string | null;
  } | null;
  createdAt: string;
}

export interface PracticeSubmission {
  id: number;
  problemSlug: string;
  language: string;
  verdict: string;
  passedCount: number;
  totalCount: number;
  safeDetailsJson: Record<string, unknown> | null;
  createdAt: string;
}
