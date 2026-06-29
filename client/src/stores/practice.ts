import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  getPracticeDebugDraft,
  getPracticeProblem,
  listPracticeProblems,
  listPracticeSubmissions,
  runPracticeDebugVisible,
  runPracticeCustom,
  runPracticeSample,
  submitPracticeDebug,
  submitPractice,
  updatePracticeDebugDraft,
  updatePracticeEditorial,
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
const DEBUG_FILE_STORAGE_KEY = 'practice-debug-file-map';
const DEBUG_DRAFT_SAVE_DEBOUNCE_MS = 600;

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

function loadDebugFileMap(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(DEBUG_FILE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

export const usePracticeStore = defineStore('practice', () => {
  const problems = ref<PracticeProblemListItem[]>([]);
  const currentProblem = ref<PracticeProblem | null>(null);
  const currentLanguageKey = ref<string>('');
  const codeMap = ref<Record<string, string>>(loadCodeMap());
  const debugFileMap = ref<Record<string, Record<string, string>>>(
    loadDebugFileMap(),
  );
  const customInput = ref('');
  const sampleRun = ref<PracticeRunSampleResult | null>(null);
  const customRun = ref<PracticeRunCustomResult | null>(null);
  const lastSubmission = ref<PracticeSubmitResult | null>(null);
  const submissions = ref<PracticeSubmission[]>([]);
  const activeBottomTab = ref<'results' | 'history'>('results');
  const loadingProblems = ref(false);
  const loadingProblem = ref(false);
  const savingEditorial = ref(false);
  const savingDebugDraft = ref(false);
  const runningSample = ref(false);
  const runningCustom = ref(false);
  const submitting = ref(false);
  const error = ref('');
  let debugDraftSaveTimer: ReturnType<typeof setTimeout> | null = null;

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

  const currentDebugFiles = computed(() => {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType !== 'debug-workspace' ||
      !currentProblem.value.debugWorkspace
    ) {
      return [];
    }

    const saved = debugFileMap.value[currentProblem.value.slug] ?? {};
    return currentProblem.value.debugWorkspace.files.map((file) => ({
      ...file,
      content: saved[file.path] ?? file.content,
    }));
  });

  function resetTransientState() {
    error.value = '';
    sampleRun.value = null;
    customRun.value = null;
    lastSubmission.value = null;
    customInput.value = '';
    activeBottomTab.value = 'results';
  }

  function persistDebugFiles() {
    localStorage.setItem(
      DEBUG_FILE_STORAGE_KEY,
      JSON.stringify(debugFileMap.value),
    );
  }

  async function flushDebugDraft() {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType !== 'debug-workspace'
    ) {
      return;
    }

    savingDebugDraft.value = true;
    try {
      const response = await updatePracticeDebugDraft({
        slug: currentProblem.value.slug,
        editedFiles: currentDebugEditedFilesPayload(),
      });
      debugFileMap.value[currentProblem.value.slug] = response.editedFiles;
      persistDebugFiles();
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      savingDebugDraft.value = false;
    }
  }

  function scheduleDebugDraftSave() {
    if (debugDraftSaveTimer) {
      clearTimeout(debugDraftSaveTimer);
    }
    debugDraftSaveTimer = setTimeout(() => {
      debugDraftSaveTimer = null;
      void flushDebugDraft();
    }, DEBUG_DRAFT_SAVE_DEBOUNCE_MS);
  }

  function getDebugFileContent(filePath: string): string {
    return (
      currentDebugFiles.value.find((file) => file.path === filePath)?.content ?? ''
    );
  }

  function setDebugFileContent(filePath: string, value: string) {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType !== 'debug-workspace'
    ) {
      return;
    }

    const original = currentProblem.value.debugWorkspace?.files.find(
      (file) => file.path === filePath,
    );
    if (!original?.editable) return;

    const problemFiles = {
      ...(debugFileMap.value[currentProblem.value.slug] ?? {}),
    };
    if (value === original.content) {
      delete problemFiles[filePath];
    } else {
      problemFiles[filePath] = value;
    }
    debugFileMap.value[currentProblem.value.slug] = problemFiles;
    persistDebugFiles();
    scheduleDebugDraftSave();
  }

  function resetDebugFile(filePath: string) {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType !== 'debug-workspace'
    ) {
      return;
    }
    const problemFiles = {
      ...(debugFileMap.value[currentProblem.value.slug] ?? {}),
    };
    delete problemFiles[filePath];
    debugFileMap.value[currentProblem.value.slug] = problemFiles;
    persistDebugFiles();
    scheduleDebugDraftSave();
  }

  function currentDebugEditedFilesPayload(): Record<string, string> {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType !== 'debug-workspace'
    ) {
      return {};
    }
    return { ...(debugFileMap.value[currentProblem.value.slug] ?? {}) };
  }

  async function fetchProblems() {
    if (problems.value.length > 0) return;
    loadingProblems.value = true;
    error.value = '';
    try {
      problems.value = await listPracticeProblems();
    } catch (caught) {
      error.value = extractErrorMessage(caught);
      problems.value = [];
    } finally {
      loadingProblems.value = false;
    }
  }

  async function openProblem(slug: string) {
    if (debugDraftSaveTimer) {
      clearTimeout(debugDraftSaveTimer);
      debugDraftSaveTimer = null;
    }
    loadingProblem.value = true;
    resetTransientState();

    try {
      currentProblem.value = await getPracticeProblem(slug);
      if (currentProblem.value.questionType === 'debug-workspace') {
        const remoteDraft = await getPracticeDebugDraft(slug);
        if (Object.keys(remoteDraft.editedFiles).length > 0) {
          debugFileMap.value[slug] = remoteDraft.editedFiles;
          persistDebugFiles();
        }
      }
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
    if (!currentProblem.value) return;
    runningSample.value = true;
    error.value = '';
    activeBottomTab.value = 'results';

    try {
      sampleRun.value =
        currentProblem.value.questionType === 'debug-workspace'
          ? await runPracticeDebugVisible({
              slug: currentProblem.value.slug,
              editedFiles: currentDebugEditedFilesPayload(),
            })
          : await runPracticeSample({
              slug: currentProblem.value.slug,
              sourceCode: currentCode.value,
              language: currentLanguage.value?.key ?? '',
            });
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      runningSample.value = false;
    }
  }

  async function runCustom() {
    if (
      !currentProblem.value ||
      currentProblem.value.questionType === 'debug-workspace' ||
      !currentLanguage.value
    ) {
      return;
    }
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
    if (!currentProblem.value) return;
    submitting.value = true;
    error.value = '';
    activeBottomTab.value = 'results';

    try {
      if (currentProblem.value.questionType === 'debug-workspace') {
        if (debugDraftSaveTimer) {
          clearTimeout(debugDraftSaveTimer);
          debugDraftSaveTimer = null;
        }
        await flushDebugDraft();
      }
      lastSubmission.value =
        currentProblem.value.questionType === 'debug-workspace'
          ? await submitPracticeDebug({
              slug: currentProblem.value.slug,
              editedFiles: currentDebugEditedFilesPayload(),
            })
          : await submitPractice({
              slug: currentProblem.value.slug,
              sourceCode: currentCode.value,
              language: currentLanguage.value?.key ?? '',
            });
      await fetchSubmissions(currentProblem.value.slug);
    } catch (caught) {
      error.value = extractErrorMessage(caught);
    } finally {
      submitting.value = false;
    }
  }

  async function saveEditorial(editorial: string) {
    if (!currentProblem.value) return;
    savingEditorial.value = true;
    error.value = '';

    try {
      const selectedLanguage = currentLanguageKey.value;
      currentProblem.value = await updatePracticeEditorial({
        slug: currentProblem.value.slug,
        editorial,
      });
      currentLanguageKey.value = currentProblem.value.supportedLanguages.some(
        (language) => language.key === selectedLanguage,
      )
        ? selectedLanguage
        : currentProblem.value.supportedLanguages[0]?.key ?? '';
    } catch (caught) {
      error.value = extractErrorMessage(caught);
      throw caught;
    } finally {
      savingEditorial.value = false;
    }
  }

  return {
    problems,
    currentProblem,
    currentLanguage,
    currentLanguageKey,
    currentCode,
    currentDebugFiles,
    customInput,
    sampleRun,
    customRun,
    lastSubmission,
    submissions,
    activeBottomTab,
    loadingProblems,
    loadingProblem,
    savingEditorial,
    savingDebugDraft,
    runningSample,
    runningCustom,
    submitting,
    error,
    fetchProblems,
    openProblem,
    setLanguage,
    getDebugFileContent,
    setDebugFileContent,
    resetDebugFile,
    fetchSubmissions,
    runSample,
    runCustom,
    submit,
    saveEditorial,
  };
});
