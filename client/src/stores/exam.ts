import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import type { Exam, ExamStatus, MyProgress } from '../types';
import api from '../services/api';

function loadCachedExam(): Exam | null {
  try {
    const raw = localStorage.getItem('cachedActiveExam');
    return raw ? (JSON.parse(raw) as Exam) : null;
  } catch (e) {
    console.warn('[exam] Failed to parse cached exam', e);
    return null;
  }
}

let _activeExamFetch: Promise<void> | null = null;

export const useExamStore = defineStore('exam', () => {
  const activeExams = ref<Exam[]>([]);
  const selectedExam = ref<Exam | null>(loadCachedExam());
  // Backward-compatible alias
  const activeExam = computed(() => selectedExam.value);

  const examStatus = ref<ExamStatus | null>(null);
  const myProgress = ref<MyProgress | null>(null);
  const solvedProblemIds = ref<number[]>([]);
  const mcqSectionSubmitted = ref(false);
  const serverDrift = ref(0);

  watch(selectedExam, (exam) => {
    if (exam) {
      localStorage.setItem('cachedActiveExam', JSON.stringify(exam));
    } else {
      localStorage.removeItem('cachedActiveExam');
    }
  });

  async function fetchActiveExam() {
    if (_activeExamFetch) return _activeExamFetch;
    _activeExamFetch = api
      .get<{ data: Exam[]; metadata: { serverTime: string } }>(
        '/exams/upcoming',
      )
      .then(({ data: response }) => {
        const exams = response.data ?? [];
        activeExams.value = exams;

        if (response.metadata?.serverTime) {
          serverDrift.value =
            dayjs(response.metadata.serverTime).valueOf() - Date.now();
        }

        // Auto-select if only one exam
        if (exams.length === 1) {
          selectedExam.value = exams[0];
        } else if (
          selectedExam.value &&
          !exams.find((e) => e.id === selectedExam.value!.id)
        ) {
          // Selected exam no longer active
          selectedExam.value = null;
        }
      })
      .catch(() => {
        activeExams.value = [];
        selectedExam.value = null;
      })
      .finally(() => {
        _activeExamFetch = null;
      });
    return _activeExamFetch;
  }

  function selectExam(exam: Exam) {
    selectedExam.value = exam;
  }

  function clearSelection() {
    selectedExam.value = null;
  }

  async function fetchExamStatus() {
    const id = selectedExam.value?.id;
    if (!id) return;
    try {
      const { data } = await api.get<ExamStatus>(`/exams/${id}/status`);
      examStatus.value = data;
    } catch (e) {
      console.warn('[exam] Failed to fetch exam status', e);
      examStatus.value = null;
    }
  }

  async function fetchMyProgress() {
    const id = selectedExam.value?.id;
    if (!id) return;
    try {
      const { data } = await api.get<MyProgress>(`/exams/${id}/my-progress`);
      myProgress.value = data;
      solvedProblemIds.value = data?.solvedProblemIds ?? [];
      mcqSectionSubmitted.value = data?.mcqSectionSubmitted ?? false;
    } catch (e) {
      console.warn('[exam] Failed to fetch progress', e);
      myProgress.value = null;
    }
  }

  function markProblemSolved(problemId: number) {
    if (!solvedProblemIds.value.includes(problemId)) {
      solvedProblemIds.value.push(problemId);
    }
  }

  return {
    activeExams,
    selectedExam,
    activeExam,
    examStatus,
    myProgress,
    solvedProblemIds,
    mcqSectionSubmitted,
    serverDrift,
    fetchActiveExam,
    selectExam,
    clearSelection,
    fetchExamStatus,
    fetchMyProgress,
    markProblemSolved,
  };
});
