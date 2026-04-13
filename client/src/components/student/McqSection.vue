<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useProblemsStore } from '../../stores/problems';
import { useMcqStore } from '../../stores/mcq';
import { useExamStore } from '../../stores/exam';
import { useToastStore } from '../../stores/toast';
import { submitMcqSection } from '../../services/api';

const props = defineProps<{ examId: number }>();

const problemsStore = useProblemsStore();
const mcqStore = useMcqStore();
const examStore = useExamStore();
const toastStore = useToastStore();

onMounted(() => {
  mcqStore.init(props.examId);
});

const mcqProblems = computed(() =>
  problemsStore.problems
    .filter((p) => p.questionType === 'mcq')
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

const isSubmitted = computed(() => mcqStore.mcqSectionSubmitted);
const isSubmitting = ref(false);
const showConfirmModal = ref(false);

function toggleOption(
  problemId: number,
  optId: string,
  isMultiSelect: boolean,
) {
  if (isSubmitted.value) return;
  const current = mcqStore.mcqDrafts[problemId] ?? [];
  let next: string[];
  if (isMultiSelect) {
    next = current.includes(optId)
      ? current.filter((id) => id !== optId)
      : [...current, optId];
  } else {
    next = [optId];
  }
  mcqStore.setDraft(problemId, next);
}

function isSelected(problemId: number, optId: string): boolean {
  return (mcqStore.mcqDrafts[problemId] ?? []).includes(optId);
}

const answeredCount = computed(
  () =>
    mcqProblems.value.filter((p) => (mcqStore.mcqDrafts[p.id]?.length ?? 0) > 0)
      .length,
);

const canSubmit = computed(
  () =>
    !isSubmitted.value &&
    !isSubmitting.value &&
    answeredCount.value === mcqProblems.value.length,
);

async function handleSubmit() {
  if (!canSubmit.value) return;
  showConfirmModal.value = false;
  isSubmitting.value = true;
  try {
    const answers = mcqProblems.value.map((p) => ({
      problemId: p.id,
      selectedOptionIds: mcqStore.mcqDrafts[p.id] ?? [],
    }));
    const result = await submitMcqSection({ examId: props.examId, answers });
    mcqStore.markSubmitted(result.totalScore);
    await examStore.fetchMyProgress();
    toastStore.add('success', 'MCQ section submitted!');
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Submission failed. Please try again.';
    toastStore.add('error', msg);
  } finally {
    isSubmitting.value = false;
  }
}


</script>

<template>
  <div class="mcq-section-wrapper">
    <!-- Header -->
    <div class="section-header">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-violet-500"
          >quiz</span
        >
        <h2 class="text-sm font-semibold text-slate-800 dark:text-white">
          MCQ Section
        </h2>
        <span class="count-chip">{{ mcqProblems.length }} questions</span>
      </div>
      <div v-if="isSubmitted" class="submitted-badge">
        <span class="material-symbols-outlined text-[14px]">check_circle</span>
        Submitted
      </div>
    </div>

    <!-- Scrollable questions -->
    <div class="questions-scroll">
      <div
        v-if="mcqProblems.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center gap-3"
      >
        <span class="material-symbols-outlined text-4xl text-slate-400"
          >quiz</span
        >
        <p class="text-sm text-slate-500">
          No MCQ questions found for this exam.
        </p>
      </div>

      <div
        v-for="(problem, qIndex) in mcqProblems"
        :key="problem.id"
        class="question-card"
      >
        <!-- Question header -->
        <div class="q-header">
          <div class="flex items-center gap-2 flex-wrap min-w-0">
            <span class="q-number">Q{{ qIndex + 1 }}</span>
            <h3 class="q-title">{{ problem.title }}</h3>
            <span v-if="problem.isMultiSelect" class="multi-badge"
              >Multi-select</span
            >
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span v-if="problem.maxScore" class="score-chip"
              >{{ problem.maxScore }} pts</span
            >
          </div>
        </div>

        <!-- Question image -->
        <div v-if="problem.questionImageData" class="q-image-wrap">
          <img
            :src="`data:image/png;base64,${problem.questionImageData}`"
            alt="Question image"
            class="q-image"
          />
        </div>

        <!-- Question description -->
        <div v-if="problem.description" class="q-description">
          {{ problem.description }}
        </div>

        <!-- Answer status indicator -->
        <div
          v-if="
            !isSubmitted && (mcqStore.mcqDrafts[problem.id]?.length ?? 0) === 0
          "
          class="unanswered-hint"
        >
          <span class="material-symbols-outlined text-[14px]"
            >error_outline</span
          >
          Not answered yet
        </div>

        <!-- Options -->
        <div
          class="options-list"
          :class="{ 'opacity-70 pointer-events-none': isSubmitted }"
        >
          <label
            v-for="opt in problem.mcqOptions ?? []"
            :key="opt.id"
            class="option-item"
            :class="{
              'option-selected': isSelected(problem.id, opt.id),
              'option-disabled': isSubmitted,
            }"
          >
            <input
              v-if="problem.isMultiSelect"
              type="checkbox"
              class="option-input"
              :checked="isSelected(problem.id, opt.id)"
              :disabled="isSubmitted"
              @change="toggleOption(problem.id, opt.id, true)"
            />
            <input
              v-else
              type="radio"
              class="option-input"
              :name="`mcq-${problem.id}`"
              :checked="isSelected(problem.id, opt.id)"
              :disabled="isSubmitted"
              @change="toggleOption(problem.id, opt.id, false)"
            />
            <span class="option-content">
              <img
                v-if="opt.imageData"
                :src="`data:image/png;base64,${opt.imageData}`"
                alt="Option image"
                class="opt-image"
              />
              <span class="option-text">{{ opt.text }}</span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Sticky bottom bar -->
    <div class="bottom-bar">
      <div v-if="!isSubmitted" class="flex items-center gap-3 flex-wrap">
        <span class="progress-text">
          <span
            :class="
              answeredCount === mcqProblems.length
                ? 'text-emerald-500'
                : 'text-amber-500'
            "
            >{{ answeredCount }}</span
          >
          / {{ mcqProblems.length }} answered
        </span>
        <span
          v-if="answeredCount < mcqProblems.length"
          class="text-[11px] text-slate-400"
        >
          Answer all questions to submit
        </span>
      </div>
      <div v-else class="submitted-info">
        <span class="material-symbols-outlined text-[16px] text-emerald-500"
          >check_circle</span
        >
        <span
          class="text-sm text-emerald-600 dark:text-emerald-400 font-medium"
        >
          Section submitted - results will be announced after the exam.
        </span>
      </div>

      <button
        v-if="!isSubmitted"
        class="submit-btn"
        :disabled="!canSubmit"
        @click="showConfirmModal = true"
      >
        <span
          v-if="isSubmitting"
          class="material-symbols-outlined text-[16px] animate-spin"
          >progress_activity</span
        >
        <span v-else class="material-symbols-outlined text-[16px]">send</span>
        {{ isSubmitting ? 'Submitting…' : 'Submit All Answers' }}
      </button>
    </div>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div
        v-if="showConfirmModal"
        class="confirm-overlay"
        @click.self="showConfirmModal = false"
      >
        <div class="confirm-dialog">
          <div class="flex items-start gap-3">
            <span
              class="material-symbols-outlined text-[24px] text-amber-500 flex-shrink-0"
              >warning</span
            >
            <div>
              <h3
                class="text-base font-semibold text-slate-900 dark:text-white mb-1"
              >
                Submit MCQ Section?
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Once submitted, your answers cannot be changed. Make sure you
                have answered all questions correctly.
              </p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 mt-5">
            <button
              class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              @click="showConfirmModal = false"
            >
              Go back
            </button>
            <button
              class="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              @click="handleSubmit"
            >
              Yes, submit
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mcq-section-wrapper {
  @apply flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark;
}

.section-header {
  @apply flex items-center justify-between px-5 py-3
         border-b border-slate-200 dark:border-white/[0.06]
         flex-shrink-0 bg-slate-50 dark:bg-[#0d1117];
}

.count-chip {
  @apply text-[10px] font-semibold px-1.5 py-0.5 rounded
         bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400;
}

.submitted-badge {
  @apply flex items-center gap-1.5 text-[11px] font-semibold
         text-emerald-600 dark:text-emerald-400
         bg-emerald-50 dark:bg-emerald-500/10
         border border-emerald-200 dark:border-emerald-500/20
         px-2.5 py-1 rounded-full;
}

.questions-scroll {
  @apply flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5;
}

.question-card {
  @apply flex flex-col gap-3 p-4 rounded-xl
         border border-slate-200 dark:border-white/[0.06]
         bg-white dark:bg-white/[0.02];
}

.q-header {
  @apply flex items-start justify-between gap-3 flex-wrap;
}

.q-number {
  @apply flex-shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded
         bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400;
}

.q-title {
  @apply text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug min-w-0;
}

.multi-badge {
  @apply text-[9px] font-medium px-1.5 py-0.5 rounded
         bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400 flex-shrink-0;
}

.score-chip {
  @apply text-[10px] font-semibold px-1.5 py-0.5 rounded
         bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400;
}

.result-badge {
  @apply flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded;
}
.result-correct {
  @apply bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400;
}
.result-wrong {
  @apply bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400;
}

.q-image-wrap {
  @apply rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.06];
}
.q-image {
  @apply max-w-full max-h-64 object-contain;
}

.q-description {
  @apply text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap;
}

.unanswered-hint {
  @apply flex items-center gap-1.5 text-[11px] text-amber-500 font-medium;
}

.options-list {
  @apply flex flex-col gap-2;
}

.option-item {
  @apply flex items-start gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer
         transition-all duration-100 select-none
         border-slate-200 dark:border-white/[0.06]
         hover:border-primary/40 hover:bg-primary/[0.03];
}
.option-selected {
  @apply border-primary/50 bg-primary/[0.06] dark:bg-primary/[0.08];
}
.option-disabled {
  @apply cursor-default hover:border-slate-200 dark:hover:border-white/[0.06] hover:bg-transparent;
}

.option-input {
  @apply mt-0.5 flex-shrink-0 accent-primary;
}

.option-content {
  @apply flex flex-col gap-1.5 flex-1 min-w-0;
}
.opt-image {
  @apply max-h-24 max-w-full object-contain rounded;
}
.option-text {
  @apply text-sm text-slate-700 dark:text-slate-300 leading-relaxed;
}

/* Sticky bottom bar */
.bottom-bar {
  @apply flex items-center justify-between gap-4 flex-wrap
         px-5 py-3 border-t border-slate-200 dark:border-white/[0.06]
         bg-slate-50 dark:bg-[#0d1117] flex-shrink-0;
}

.progress-text {
  @apply text-sm font-medium text-slate-600 dark:text-slate-300;
}

.submitted-info {
  @apply flex items-center gap-2;
}

.submit-btn {
  @apply flex items-center gap-1.5 px-4 py-2 rounded-lg
         bg-primary text-white text-sm font-semibold
         disabled:opacity-40 disabled:cursor-not-allowed
         hover:bg-primary/90 transition-colors ml-auto;
}

/* Confirmation overlay */
.confirm-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center
         bg-black/40 backdrop-blur-[2px] p-4;
}

.confirm-dialog {
  @apply w-full max-w-sm bg-white dark:bg-[#1a2332]
         border border-slate-200 dark:border-white/[0.08]
         rounded-2xl p-6 shadow-2xl;
}
</style>
