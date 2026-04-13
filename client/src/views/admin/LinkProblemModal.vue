<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import {
  listAllProblems,
  getCachedExams,
  assignProblemToExam,
} from '../../services/adminApi';
import { usePagination } from '../../composables/usePagination';
import type { ExamWithProblems, ProblemRow } from '../../types/admin';

const props = defineProps<{
  examId?: number;
  currentDisplayOrders: number[];
}>();

const emit = defineEmits<{
  linked: [];
  close: [];
  selected: [
    problem: {
      id: number;
      title: string;
      difficulty: string | null;
      testCaseCount: number;
    },
  ];
}>();

interface FlatProblem {
  id: number;
  title: string;
  examId: number;
  examTitle: string;
  displayOrder: number;
  difficulty: string | null;
  testCaseCount: number;
}

const exams = ref<ExamWithProblems[]>([]);
const saving = ref(false);
const error = ref('');
const search = ref('');
const selectedId = ref<number | null>(null);
const nextOrder = computed(() => {
  if (props.currentDisplayOrders.length === 0) return 1;
  return Math.max(...props.currentDisplayOrders) + 1;
});
const displayOrder = ref(nextOrder.value);

// Load exams from cache
getCachedExams()
  .then((e) => {
    exams.value = e;
  })
  .catch(() => {});

const examMap = computed(
  () => new Map(exams.value.map((e) => [e.id, e.title])),
);

const {
  items: rawProblems,
  loading,
  resetAndLoad,
} = usePagination<ProblemRow>({
  limit: 50,
  fetcher: (params) =>
    listAllProblems(undefined, {
      ...params,
      search: search.value || undefined,
    }),
  immediate: true,
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(resetAndLoad, 300);
});

const filtered = computed<FlatProblem[]>(() =>
  rawProblems.value.map((p) => ({
    id: p.id,
    title: p.title,
    examId: p.examId ?? 0,
    examTitle: examMap.value.get(p.examId ?? 0) ?? `Problem #${p.id}`,
    displayOrder: p.displayOrder,
    difficulty: p.difficulty ?? null,
    testCaseCount: p.testCases?.length ?? 0,
  })),
);

async function confirm() {
  if (!selectedId.value) return;
  if (!props.examId) {
    const p = filtered.value.find((prob) => prob.id === selectedId.value);
    if (p) {
      emit('selected', {
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        testCaseCount: p.testCaseCount,
      });
    }
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await assignProblemToExam(
      selectedId.value,
      props.examId,
      displayOrder.value,
    );
    emit('linked');
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } };
    error.value = ax?.response?.data?.message ?? 'Failed to link problem.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    @mousedown.self="emit('close')"
  >
    <div
      class="bg-white dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[80vh]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0"
      >
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">
          Link Existing Problem
        </h3>
        <button
          class="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          @click="emit('close')"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Select a problem from another exam to move it into this exam. Its test
          cases will follow.
        </p>

        <input
          v-model="search"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          placeholder="Search by title or exam…"
        />

        <div v-if="loading" class="text-xs text-slate-400 text-center py-4">
          Loading…
        </div>
        <div
          v-else-if="filtered.length === 0"
          class="text-xs text-slate-400 text-center py-4"
        >
          No problems found from other exams.
        </div>

        <div
          v-else
          class="flex flex-col gap-1 max-h-[280px] overflow-y-auto -mx-1 px-1"
        >
          <button
            v-for="p in filtered"
            :key="p.id"
            class="w-full text-left px-3 py-2.5 rounded-lg border transition-all"
            :class="
              selectedId === p.id
                ? 'border-primary/50 bg-primary/5 text-slate-900 dark:text-white'
                : 'border-transparent hover:border-slate-200 dark:hover:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300'
            "
            @click="selectedId = p.id"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono text-[10px] text-slate-400 flex-shrink-0"
                  >#{{ p.displayOrder }}</span
                >
                <span class="text-sm font-medium truncate">{{ p.title }}</span>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium"
                  :class="{
                    'bg-emerald-500/10 text-emerald-500':
                      p.difficulty === 'easy',
                    'bg-yellow-500/10 text-yellow-500':
                      !p.difficulty || p.difficulty === 'medium',
                    'bg-red-500/10 text-red-400': p.difficulty === 'hard',
                  }"
                  >{{ p.difficulty ?? 'medium' }}</span
                >
                <span class="text-[10px] text-slate-400"
                  >{{ p.testCaseCount }} TC</span
                >
              </div>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              from: {{ p.examTitle }}
            </div>
          </button>
        </div>

        <!-- Display order for this exam -->
        <div
          v-if="selectedId !== null && props.examId"
          class="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]"
        >
          <label class="text-xs font-medium text-slate-500 flex-shrink-0"
            >Display order in this exam</label
          >
          <input
            v-model.number="displayOrder"
            type="number"
            min="1"
            class="w-20 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div v-if="error" class="text-xs text-red-400">{{ error }}</div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-200 dark:border-white/[0.06] flex-shrink-0"
      >
        <RegalButton size="sm" @click="emit('close')"> Cancel </RegalButton>
        <RegalButton
          variant="primary"
          size="sm"
          :disabled="!selectedId || saving"
          @click="confirm"
        >
          {{ saving ? 'Linking…' : 'Link Problem' }}
        </RegalButton>
      </div>
    </div>
  </div>
</template>
