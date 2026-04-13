import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Problem } from '../types';

/** Strip base64 imageData before writing to localStorage to stay within the 5 MB quota. */
function stripImages(problems: Problem[]): Problem[] {
  return problems.map((p) => ({
    ...p,
    imageData: undefined,
    mcqOptions:
      p.mcqOptions?.map((o) => ({ ...o, imageData: undefined })) ??
      p.mcqOptions,
  }));
}

function currentExamId(): number | null {
  try {
    const raw = localStorage.getItem('cachedActiveExam');
    return raw ? (JSON.parse(raw) as { id: number }).id : null;
  } catch (e) {
    console.warn('[problems] Failed to read cached exam ID', e);
    return null;
  }
}

export const useProblemsStore = defineStore('problems', () => {
  const problems = ref<Problem[]>(
    (() => {
      try {
        const raw = localStorage.getItem('cachedProblems');
        if (!raw) return [];
        const stored = JSON.parse(raw) as { examId: number; data: Problem[] };
        if (stored.examId !== currentExamId()) return [];
        return stored.data;
      } catch (e) {
        console.warn('[problems] Failed to load cached problems', e);
        return [];
      }
    })(),
  );

  const problemDetails = ref<Record<number, Problem>>(
    (() => {
      try {
        const raw = localStorage.getItem('cachedProblemDetails');
        if (!raw) return {};
        const stored = JSON.parse(raw) as {
          examId: number;
          data: Record<number, Problem>;
        };
        if (stored.examId !== currentExamId()) return {};
        return stored.data;
      } catch (e) {
        console.warn('[problems] Failed to load cached problem details', e);
        return {};
      }
    })(),
  );

  function setProblems(list: Problem[]) {
    problems.value = list;
    const examId = currentExamId();
    try {
      localStorage.setItem(
        'cachedProblems',
        JSON.stringify({ examId, data: stripImages(list) }),
      );
    } catch (e) {
      console.warn('[problems] Failed to cache problems (quota?)', e);
    }
  }

  function clearProblems() {
    problems.value = [];
    problemDetails.value = {};
    localStorage.removeItem('cachedProblems');
    localStorage.removeItem('cachedProblemDetails');
  }

  function cacheProblemDetail(problem: Problem) {
    problemDetails.value[problem.id] = problem;
    const examId = currentExamId();
    try {
      const stripped = Object.fromEntries(
        Object.entries(problemDetails.value).map(([k, v]) => [
          k,
          stripImages([v])[0],
        ]),
      );
      localStorage.setItem(
        'cachedProblemDetails',
        JSON.stringify({ examId, data: stripped }),
      );
    } catch (e) {
      console.warn('[problems] Failed to cache problem detail (quota?)', e);
    }
  }

  function getProblemDetail(id: number): Problem | null {
    return problemDetails.value[id] ?? null;
  }

  return {
    problems,
    problemDetails,
    setProblems,
    clearProblems,
    cacheProblemDetail,
    getProblemDetail,
  };
});
