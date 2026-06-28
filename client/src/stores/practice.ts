import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  getPracticeProblem,
  listPracticeProblems,
  listPracticeSubmissions,
  runPracticeCustom,
  runPracticeSample,
  submitPractice,
} from '../services/api';
import type {
  PracticeLanguage,
  PracticeProblem,
  PracticeProblemListItem,
  PracticeRunCustomResult,
  PracticeRunSampleResult,
  PracticeSubmission,
  PracticeSubmitResult,
} from '../types';

const CODE_STORAGE_KEY = 'practice-code-map';

function extractErrorMessage(error: unknown): string {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? 'Something went wrong. Please try again.';
}

function loadCodeMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CODE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export const usePracticeStore = defineStore('practice', () => {
  const problems = ref<PracticeProblemListItem[]>([]);
  const currentProblem = ref<PracticeProblem | null>(null);
  const currentLanguageKey = ref<string>('');
  const codeMap = ref<Record<string, string>>(loadCodeMap());
  const customInput = ref('');
  const sampleRun = ref<PracticeRunSampleResult | null>(null);
  const customRun = ref<PracticeRunCustomResult | null>(null);
  const lastSubmission = ref<PracticeSubmitResult | null>(null);
  const submissions = ref<PracticeSubmission[]>([]);
  const activeBottomTab = ref<'results' | 'history'>('results');
  const loadingProblems = ref(false);
  const loadingProblem = ref(false);
  const runningSample = ref(false);
  const runningCustom = ref(false);
  const submitting = ref(false);
  const error = ref('');

  const supportedLanguages = computed<PracticeLanguage[]>(() => {
    return currentProblem.value?.supportedLanguages ?? [];
  });

  const currentLanguage = computed<PracticeLanguage | null>(() => {
    return (
      supportedLanguages.value.find(
        (lang) => lang.key === currentLanguageKey.value,
      ) ??
      supportedLanguages.value[0] ??
      null
    );
  });

  const currentCodeKey = computed(() => {
    if (!currentProblem.value || !currentLanguage.value) return '';
    return `${currentProblem.value.slug}:${currentLanguage.value.key}`;
  });

  const currentCode = computed({
    get: () => {
      if (!currentProblem.value || !currentLanguage.value) return '';
      const saved = codeMap.value[currentCodeKey.value];
      if (saved !== undefined) return saved;
      return currentProblem.value.starterCode[currentLanguage.value.key] ?? '';
    },
    set: (value: string) => {
      if (!currentCodeKey.value) return;
      codeMap.value[currentCodeKey.value] = value;
      localStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(codeMap.value));
    },
  });

  function resetTransientState() {
    error.value = '';
    sampleRun.value = null;
    customRun.value = null;
    lastSubmission.value = null;
    customInput.value = '';
    activeBottomTab.value = 'results';
  }

  async function fetchProblems() {
    if (problems.value.length > 0) return;
    loadingProblems.value = true;
    try {
      problems.value = await listPracticeProblems();
    } finally {
      loadingProblems.value = false;
    }
  }

  async function openProblem(slug: string) {
    loadingProblem.value = true;
    resetTransientState();

    try {
      currentProblem.value = await getPracticeProblem(slug);
      currentLanguageKey.value =
        currentProblem.value.supportedLanguages[0]?.key ?? '';
      await fetchSubmissions(slug);
    } catch (caught) {
      error.value = extractErrorMessage(caught);
      currentProblem.value = null;
      submissions.value = [];
    } finally {
      loadingProblem.value = false;
    }
  }

  function setLanguage(key: string) {
    currentLanguageKey.value = key;
  }

  async function fetchSubmissions(slug?: string) {
    const targetSlug = slug ?? currentProblem.value?.slug;
    if (!targetSlug) return;
    submissions.value = await listPracticeSubmissions(targetSlug);
  }

  async function runSample() {
    if (!currentProblem.value || !currentLanguage.value) return;
    runningSample.value = true;
    error.value = '';
    activeBottomTab.value = 'results';

    try {
      sampleRun.value = await runPracticeSample({
        slug: currentProblem.value.slug,
        sourceCode: currentCode.value,
        language: currentLanguage.value.key,
      });
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      runningSample.value = false;
    }
  }

  async function runCustom() {
    if (!currentProblem.value || !currentLanguage.value) return;
    runningCustom.value = true;
    error.value = '';
    activeBottomTab.value = 'results';

    try {
      customRun.value = await runPracticeCustom({
        slug: currentProblem.value.slug,
        sourceCode: currentCode.value,
        language: currentLanguage.value.key,
        customInput: customInput.value,
      });
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      runningCustom.value = false;
    }
  }

  async function submit() {
    if (!currentProblem.value || !currentLanguage.value) return;
    submitting.value = true;
    error.value = '';
    activeBottomTab.value = 'results';

    try {
      lastSubmission.value = await submitPractice({
        slug: currentProblem.value.slug,
        sourceCode: currentCode.value,
        language: currentLanguage.value.key,
      });
      await fetchSubmissions(currentProblem.value.slug);
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      submitting.value = false;
    }
  }

  return {
    problems,
    currentProblem,
    currentLanguage,
    currentLanguageKey,
    currentCode,
    customInput,
    sampleRun,
    customRun,
    lastSubmission,
    submissions,
    activeBottomTab,
    loadingProblems,
    loadingProblem,
    runningSample,
    runningCustom,
    submitting,
    error,
    fetchProblems,
    openProblem,
    setLanguage,
    fetchSubmissions,
    runSample,
    runCustom,
    submit,
  };
});
