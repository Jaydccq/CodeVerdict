<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getSubmission,
  deleteSubmission,
  getProblem,
} from '../../services/adminApi';
import type { AdminSubmission } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';

const route = useRoute();
const router = useRouter();
const submission = ref<AdminSubmission | null>(null);
const loading = ref(true);
const error = ref('');
const errorRaw = ref('');
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const problem = ref<{
  questionType?: 'coding' | 'mcq';
  questionImageData?: string | null;
  mcqOptions?: Array<{
    id: number;
    text: string;
    imageData?: string | null;
    isCorrect: boolean;
  }>;
  testCases: {
    input: string;
    expectedOutput: string;
    isVisible: boolean;
    displayOrder: number;
  }[];
} | null>(null);
const expandedRows = ref<Set<number>>(new Set());

const isMcq = computed(
  () =>
    problem.value?.questionType === 'mcq' ||
    submission.value?.selectedOptionIds != null,
);

onMounted(async () => {
  loading.value = true;
  try {
    submission.value = await getSubmission(Number(route.params.id));
    if (submission.value?.problem?.id) {
      try {
        problem.value = (await getProblem(
          submission.value.problem.id,
        )) as typeof problem.value;
      } catch {
        // non-critical
      }
    }
    // Auto-expand failing rows (coding only)
    if (submission.value?.testResults) {
      submission.value.testResults.forEach((t, i) => {
        if (!t.passed) expandedRows.value.add(i);
      });
    }
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to load submission.';
    errorRaw.value = e.raw;
  } finally {
    loading.value = false;
  }
});

// Build the MCQ answer display from problem options + selected IDs
const mcqAnswerDisplay = computed(() => {
  if (!isMcq.value || !submission.value) return [];
  const selectedIds = new Set(submission.value.selectedOptionIds ?? []);
  const options = problem.value?.mcqOptions ?? [];
  return options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    imageData: opt.imageData ?? null,
    isCorrect: opt.isCorrect,
    wasSelected: selectedIds.has(opt.id),
  }));
});

async function onDelete() {
  if (!submission.value) return;
  deleting.value = true;
  try {
    await deleteSubmission(submission.value.id);
    void router.push({ name: 'admin-submissions' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to delete submission.';
    errorRaw.value = e.raw;
    showDeleteConfirm.value = false;
  } finally {
    deleting.value = false;
  }
}

const verdictClass: Record<string, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-500',
  wrong_answer: 'bg-red-500/10 text-red-400',
  time_limit_exceeded: 'bg-yellow-500/10 text-yellow-500',
  compilation_error: 'bg-orange-500/10 text-orange-400',
  runtime_error: 'bg-purple-500/10 text-purple-400',
};

function fullDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function extractError(err: unknown): { message: string; raw: string } {
  const ax = err as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  if (ax.response) {
    const respData = ax.response.data as { message?: string } | undefined;
    return {
      message: respData?.message ?? ax.response.statusText ?? 'Error',
      raw: `${ax.response.status} ${ax.response.statusText}: ${JSON.stringify(ax.response.data, null, 2)}`,
    };
  }
  return {
    message: ax.message ?? 'Unknown error',
    raw: ax.message ?? 'Unknown error',
  };
}

function toggleRow(i: number) {
  if (expandedRows.value.has(i)) {
    expandedRows.value.delete(i);
  } else {
    expandedRows.value.add(i);
  }
}
</script>

<template>
  <div class="max-w-[900px]">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <RegalButton @click="router.push({ name: 'admin-submissions' })"
          >← Back</RegalButton
        >
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          Submission #{{ route.params.id }}
        </h2>
      </div>
      <RegalButton variant="danger" @click="showDeleteConfirm = true"
        >Delete</RegalButton
      >
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <div
      v-else-if="error"
      class="border-l-[3px] border-red-500 bg-red-500/[0.08] p-3 rounded-r-lg"
    >
      <div class="text-sm text-red-400 font-medium">{{ error }}</div>
      <pre
        v-if="errorRaw"
        class="mt-2 font-mono text-xs text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap break-all"
        >{{ errorRaw }}</pre
      >
    </div>

    <template v-else-if="submission">
      <!-- Summary grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Student</span
          >
          <span class="text-sm text-slate-900 dark:text-white"
            >{{ submission.user?.firstName }}
            {{ submission.user?.lastName }} ({{
              submission.user?.rollNumber
            }})</span
          >
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Exam</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            submission.exam?.title ?? '-'
          }}</span>
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Problem</span
          >
          <span class="text-sm text-slate-900 dark:text-white">
            {{ submission.problem?.title ?? '-' }}
            <span
              v-if="isMcq"
              class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
              >MCQ</span
            >
          </span>
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >{{ isMcq ? 'Type' : 'Language' }}</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            isMcq ? 'Multiple Choice' : submission.language || '-'
          }}</span>
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Verdict</span
          >
          <span
            class="inline-flex self-start px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
            :class="
              verdictClass[submission.verdict] ??
              'bg-slate-500/10 text-slate-400'
            "
          >
            {{ submission.verdict?.replace(/_/g, ' ') }}
          </span>
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Score</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            Number(submission.score).toFixed(2)
          }}</span>
        </div>
        <!-- Tests passed: coding only -->
        <div
          v-if="!isMcq"
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Tests Passed</span
          >
          <span class="text-sm text-slate-900 dark:text-white"
            >{{ submission.passedTestCases }}/{{
              submission.totalTestCases
            }}</span
          >
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Submitted</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            fullDate(submission.submittedAt)
          }}</span>
        </div>
      </div>

      <!-- ─── MCQ Answer Display ─── -->
      <div v-if="isMcq" class="mb-7">
        <!-- Question image -->
        <div
          v-if="problem?.questionImageData"
          class="mb-4 rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.06] inline-block"
        >
          <img
            :src="`data:image/png;base64,${problem.questionImageData}`"
            alt="Question image"
            class="max-w-full max-h-64 object-contain"
          />
        </div>

        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Selected Answer(s)
        </h3>

        <!-- Full option breakdown (when problem data loaded) -->
        <div v-if="mcqAnswerDisplay.length" class="flex flex-col gap-2">
          <div
            v-for="opt in mcqAnswerDisplay"
            :key="opt.id"
            class="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm"
            :class="[
              opt.wasSelected && opt.isCorrect
                ? 'border-emerald-400/40 bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]'
                : opt.wasSelected && !opt.isCorrect
                  ? 'border-red-400/40 bg-red-500/[0.05] dark:bg-red-500/[0.08]'
                  : !opt.wasSelected && opt.isCorrect
                    ? 'border-emerald-300/30 bg-emerald-500/[0.02]'
                    : 'border-slate-200 dark:border-white/[0.06]',
            ]"
          >
            <span class="flex-shrink-0 mt-0.5">
              <span
                v-if="opt.wasSelected && opt.isCorrect"
                class="material-symbols-outlined text-[18px] text-emerald-500"
                >check_circle</span
              >
              <span
                v-else-if="opt.wasSelected && !opt.isCorrect"
                class="material-symbols-outlined text-[18px] text-red-400"
                >cancel</span
              >
              <span
                v-else-if="!opt.wasSelected && opt.isCorrect"
                class="material-symbols-outlined text-[18px] text-emerald-400/50"
                >radio_button_unchecked</span
              >
              <span
                v-else
                class="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600"
                >radio_button_unchecked</span
              >
            </span>
            <div class="flex-1 flex flex-col gap-1">
              <span class="text-slate-800 dark:text-slate-200">{{
                opt.text
              }}</span>
              <img
                v-if="opt.imageData"
                :src="`data:image/png;base64,${opt.imageData}`"
                alt="Option image"
                class="max-h-28 max-w-full object-contain rounded border border-slate-200 dark:border-white/[0.06]"
              />
              <div
                class="flex gap-2 text-[10px] font-semibold uppercase tracking-wide"
              >
                <span v-if="opt.wasSelected" class="text-slate-500"
                  >Student selected</span
                >
                <span v-if="opt.isCorrect" class="text-emerald-500"
                  >Correct answer</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Fallback: show raw IDs if problem options not available -->
        <div
          v-else
          class="px-4 py-3 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Selected Option IDs</span
          >
          <span
            class="block text-sm text-slate-900 dark:text-white mt-1 font-mono"
          >
            {{ (submission.selectedOptionIds ?? []).join(', ') || '(none)' }}
          </span>
        </div>
      </div>

      <!-- ─── Code block (coding only) ─── -->
      <div v-if="!isMcq" class="mb-7">
        <div class="flex items-center gap-2.5 mb-2">
          <span class="text-sm font-semibold text-slate-900 dark:text-white"
            >Code</span
          >
          <span
            class="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded px-2 py-0.5 text-[11px] font-semibold text-slate-500"
            >{{ submission.language }}</span
          >
        </div>
        <pre
          class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre m-0 leading-relaxed"
        ><code>{{ submission.code }}</code></pre>
      </div>

      <!-- ─── Test results table (coding only) ─── -->
      <div v-if="!isMcq && submission.testResults?.length" class="mb-6">
        <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-3">
          Test Results
        </h3>
        <div
          class="overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <table class="w-full text-[13px]">
            <thead>
              <tr>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  #
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Status
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Time
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Memory
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(t, i) in submission.testResults" :key="i">
                <tr
                  class="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  @click="toggleRow(i)"
                >
                  <td
                    class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                  >
                    {{ i + 1 }}
                  </td>
                  <td
                    class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                  >
                    <span
                      :class="
                        t.passed
                          ? 'text-emerald-500 font-medium'
                          : 'text-red-400 font-medium'
                      "
                    >
                      {{ t.passed ? '✓' : '✗' }} {{ t.status }}
                    </span>
                  </td>
                  <td
                    class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                  >
                    {{
                      t.time
                        ? `${(parseFloat(t.time) * 1000).toFixed(0)}ms`
                        : '-'
                    }}
                  </td>
                  <td
                    class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                  >
                    {{ t.memory ? `${(t.memory / 1024).toFixed(1)} MB` : '-' }}
                  </td>
                </tr>
                <tr
                  v-if="
                    expandedRows.has(i) && problem?.testCases?.[t.index - 1]
                  "
                  :key="`expand-${i}`"
                >
                  <td
                    colspan="4"
                    class="px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    <div
                      class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono"
                    >
                      <div>
                        <div
                          class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1"
                        >
                          Input
                        </div>
                        <pre
                          class="bg-slate-900 text-slate-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32"
                          >{{
                            problem.testCases[t.index - 1].input || '(empty)'
                          }}</pre
                        >
                      </div>
                      <div>
                        <div
                          class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1"
                        >
                          Expected Output
                        </div>
                        <pre
                          class="bg-slate-900 text-slate-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32"
                          >{{
                            problem.testCases[t.index - 1].expectedOutput ||
                            '(empty)'
                          }}</pre
                        >
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete Submission"
      :message="`Delete submission #${route.params.id}? This cannot be undone.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
