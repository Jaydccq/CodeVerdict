import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type {
  McqSubmitResult,
  PracticeProblem,
  PracticeProblemListItem,
  PracticeRunCustomResult,
  PracticeRunSampleResult,
  PracticeSubmission,
  PracticeSubmitResult,
  RunResult,
  Submission,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && useAuthStore().accessToken) {
      useToastStore().add(
        'error',
        'Session expired. Refresh your token to continue.',
      );
    }
    return Promise.reject(error as Error);
  },
);

export default api;

export async function runCode(payload: {
  examId: number;
  problemId: number;
  sourceCode: string;
  languageId: number;
  customInput?: string;
}): Promise<RunResult> {
  const { examId, problemId, ...body } = payload;
  const { data } = await api.post<RunResult>(
    `/exams/${examId}/problems/${problemId}/run`,
    body,
  );
  return data;
}

export async function submitCode(payload: {
  examId: number;
  problemId: number;
  sourceCode: string;
  languageId: number;
}): Promise<Submission> {
  const { examId, problemId, ...body } = payload;
  const { data } = await api.post<Submission>(
    `/exams/${examId}/problems/${problemId}/submissions`,
    body,
  );
  return data;
}

export async function listSubmissions(
  examId: number,
  problemId: number,
): Promise<Submission[]> {
  const { data } = await api.get<Submission[]>(
    `/exams/${examId}/problems/${problemId}/submissions`,
  );
  return data;
}

export async function getSubmissionById(
  examId: number,
  problemId: number,
  submissionId: number,
): Promise<Submission> {
  const { data } = await api.get<Submission>(
    `/exams/${examId}/problems/${problemId}/submissions/${submissionId}`,
  );
  return data;
}

export async function submitMcqSection(payload: {
  examId: number;
  answers: Array<{ problemId: number; selectedOptionIds: string[] }>;
}): Promise<McqSubmitResult> {
  const { examId, answers } = payload;
  const { data } = await api.post<McqSubmitResult>(
    `/exams/${examId}/mcq-section/submit`,
    {
      answers,
    },
  );
  return data;
}

export async function listPracticeProblems(): Promise<
  PracticeProblemListItem[]
> {
  const { data } = await api.get<PracticeProblemListItem[]>('/problems');
  return data;
}

export async function getPracticeProblem(
  slug: string,
): Promise<PracticeProblem> {
  const { data } = await api.get<PracticeProblem>(`/problems/${slug}`);
  return data;
}

export async function runPracticeSample(payload: {
  slug: string;
  sourceCode: string;
  language: string;
}): Promise<PracticeRunSampleResult> {
  const { slug, ...body } = payload;
  const { data } = await api.post<PracticeRunSampleResult>(
    `/problems/${slug}/run-sample`,
    body,
  );
  return data;
}

export async function runPracticeCustom(payload: {
  slug: string;
  sourceCode: string;
  language: string;
  customInput: string;
}): Promise<PracticeRunCustomResult> {
  const { slug, ...body } = payload;
  const { data } = await api.post<PracticeRunCustomResult>(
    `/problems/${slug}/run-custom`,
    body,
  );
  return data;
}

export async function submitPractice(payload: {
  slug: string;
  sourceCode: string;
  language: string;
}): Promise<PracticeSubmitResult> {
  const { slug, ...body } = payload;
  const { data } = await api.post<PracticeSubmitResult>(
    `/problems/${slug}/submit`,
    body,
  );
  return data;
}

export async function listPracticeSubmissions(
  slug: string,
): Promise<PracticeSubmission[]> {
  const { data } = await api.get<PracticeSubmission[]>(
    `/problems/${slug}/submissions`,
  );
  return data;
}
