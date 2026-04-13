import { defineStore } from 'pinia';
import { ref } from 'vue';

// Draft answers: problemId → selectedOptionIds (UUID strings)
// Persisted to sessionStorage keyed by examId so they survive refreshes within a session.

function storageKey(examId: number) {
  return `mcqDrafts_${examId}`;
}

function loadDrafts(examId: number): Record<number, string[]> {
  try {
    const raw = sessionStorage.getItem(storageKey(examId));
    return raw ? (JSON.parse(raw) as Record<number, string[]>) : {};
  } catch {
    return {};
  }
}

function saveDrafts(examId: number, drafts: Record<number, string[]>) {
  try {
    sessionStorage.setItem(storageKey(examId), JSON.stringify(drafts));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

function loadSubmitted(examId: number): boolean {
  return sessionStorage.getItem(`mcqSubmitted_${examId}`) === 'true';
}

function saveSubmitted(examId: number) {
  sessionStorage.setItem(`mcqSubmitted_${examId}`, 'true');
}

export const useMcqStore = defineStore('mcq', () => {
  const currentExamId = ref<number | null>(null);
  const mcqDrafts = ref<Record<number, string[]>>({});
  const mcqSectionSubmitted = ref(false);
  const mcqTotalScore = ref<number | null>(null);

  /** Call once when the exam is known (e.g. after fetchActiveExam). */
  function init(examId: number) {
    if (currentExamId.value === examId) return;
    currentExamId.value = examId;
    mcqDrafts.value = loadDrafts(examId);
    mcqSectionSubmitted.value = loadSubmitted(examId);
    mcqTotalScore.value = null;
  }

  function setDraft(problemId: number, selectedOptionIds: string[]) {
    mcqDrafts.value[problemId] = selectedOptionIds;
    if (currentExamId.value !== null) {
      saveDrafts(currentExamId.value, mcqDrafts.value);
    }
  }

  function markSubmitted(totalScore: number) {
    mcqSectionSubmitted.value = true;
    mcqTotalScore.value = totalScore;
    if (currentExamId.value !== null) {
      saveSubmitted(currentExamId.value);
    }
  }

  return {
    currentExamId,
    mcqDrafts,
    mcqSectionSubmitted,
    mcqTotalScore,
    init,
    setDraft,
    markSubmitted,
  };
});
