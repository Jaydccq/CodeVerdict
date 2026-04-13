import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { runCode, submitCode } from '../services/api';
import type { RunResult, Submission } from '../types';
import { useEditorStore } from './editor';
import { useUiStore } from './ui';
import { useExamStore } from './exam';
import { useToastStore } from './toast';

function extractMessage(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? 'Something went wrong. Please try again.';
}

export const useRunSubmitStore = defineStore('runSubmit', () => {
  const runResult = ref<RunResult | null>(null);
  const submission = ref<Submission | null>(null);
  const running = ref(false);
  const submitting = ref(false);
  const lastRunHadCustomInput = ref(false);

  const alreadySolved = computed(() => {
    const editorStore = useEditorStore();
    const examStore = useExamStore();
    return examStore.solvedProblemIds.includes(
      editorStore.activeProblemId ?? -1,
    );
  });

  // Reset run/submission results when switching problems
  const editorStoreWatcher = useEditorStore();
  watch(
    () => editorStoreWatcher.activeProblemId,
    () => {
      submission.value = null;
      runResult.value = null;
    },
  );

  async function run(customInput?: string) {
    const editorStore = useEditorStore();
    const uiStore = useUiStore();
    if (!editorStore.activeProblemId) return;
    const examId = useExamStore().activeExam?.id;
    if (!examId) return;
    lastRunHadCustomInput.value = !!customInput;
    running.value = true;
    uiStore.setBottomTab('run-results');
    try {
      runResult.value = await runCode({
        examId,
        problemId: editorStore.activeProblemId,
        sourceCode: editorStore.code,
        languageId: editorStore.language.id,
        customInput: customInput || undefined,
      });
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === 'ALREADY_SOLVED') {
        useExamStore().markProblemSolved(editorStore.activeProblemId);
      } else {
        useToastStore().add('error', extractMessage(err));
      }
    } finally {
      running.value = false;
    }
  }

  async function submit() {
    const editorStore = useEditorStore();
    const uiStore = useUiStore();
    if (!editorStore.activeProblemId) return;
    const examId = useExamStore().activeExam?.id;
    if (!examId) return;
    submitting.value = true;
    uiStore.setBottomTab('test-results');
    try {
      submission.value = await submitCode({
        examId,
        problemId: editorStore.activeProblemId,
        sourceCode: editorStore.code,
        languageId: editorStore.language.id,
      });
      if (submission.value?.verdict === 'accepted') {
        useExamStore().markProblemSolved(editorStore.activeProblemId);
        void useExamStore().fetchMyProgress();
      }
    } catch (err: unknown) {
      const message = extractMessage(err);
      const code = (err as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === 'ALREADY_SOLVED') {
        useExamStore().markProblemSolved(editorStore.activeProblemId);
      } else {
        useToastStore().add('error', message);
      }
    } finally {
      submitting.value = false;
    }
  }

  return {
    runResult,
    submission,
    running,
    submitting,
    alreadySolved,
    lastRunHadCustomInput,
    run,
    submit,
  };
});
