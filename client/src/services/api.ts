import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { RunResult, Submission, McqSubmitResult } from '../types';

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
