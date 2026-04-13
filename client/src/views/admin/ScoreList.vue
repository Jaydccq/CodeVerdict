<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { listAggregatedScores } from '../../services/adminApi';
import type { AggregatedScore } from '../../types/admin';
import TablePagination from '../../components/shared/TablePagination.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

const router = useRouter();
interface ExamOption {
  id: number;
  title: string;
}

const exams = ref<ExamOption[]>([]);
const search = ref('');
const examFilter = ref<number | ''>('');
const qaFilterOnly = ref(false);

function updateExamOptions(rows: AggregatedScore[]) {
  const map = new Map<number, ExamOption>();
  for (const e of exams.value) map.set(e.id, e);
  for (const s of rows) {
    if (s.exam && !map.has(s.examId)) {
      map.set(s.examId, { id: s.examId, title: s.exam.title });
    }
  }
  exams.value = [...map.values()].sort((a, b) => a.id - b.id);
}

const {
  items: scores,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<AggregatedScore>({
  fetcher: async (params) => {
    const result = await listAggregatedScores(
      examFilter.value || undefined,
      params,
      qaFilterOnly.value ? { qaRoleOptIn: true } : undefined,
    );
    updateExamOptions(result.data);
    return result;
  },
});

const examOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All Exams' },
  ...exams.value.map((e) => ({ value: e.id, label: e.title })),
]);

function onExamChange() {
  resetAndLoad();
}

function toggleQaFilter() {
  qaFilterOnly.value = !qaFilterOnly.value;
  resetAndLoad();
}

const filtered = computed(() => {
  if (!search.value) return scores.value;
  const q = search.value.toLowerCase();
  return scores.value.filter(
    (s) =>
      s.user?.rollNumber?.toLowerCase().includes(q) ||
      s.user?.firstName?.toLowerCase().includes(q) ||
      s.user?.lastName?.toLowerCase().includes(q) ||
      s.exam?.title?.toLowerCase().includes(q),
  );
});

function scoreColor(score: number) {
  if (score >= 7) return 'score-high';
  if (score >= 3) return 'score-mid';
  return 'score-low';
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function viewDetail(s: AggregatedScore) {
  void router.push({
    name: 'admin-score-detail',
    params: { examId: s.examId, userId: s.userId },
  });
}
</script>

<template>
  <div class="max-w-[1100px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Scores</h2>
        <span
          class="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500"
          >{{ filtered.length }}</span
        >
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="sm:w-48 w-full">
          <RegalSelect
            v-model="examFilter"
            :options="examOptions"
            placeholder="All Exams"
            @change="onExamChange"
          />
        </div>
        <input
          v-model="search"
          class="w-full sm:w-44 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          placeholder="Search…"
        />
        <button
          class="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
          :class="
            qaFilterOnly
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : 'bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-purple-500/30 hover:text-purple-400'
          "
          @click="toggleQaFilter"
        >
          QA Opt-In
        </button>
        <RegalButton
          variant="primary"
          size="sm"
          @click="router.push({ name: 'admin-score-create' })"
        >
          + Add Score
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="text-sm text-slate-400">
        No scores recorded yet - scores are created when students submit
        solutions.
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div
          class="hidden sm:block overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <table class="w-full text-[13px]">
            <thead>
              <tr>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Student
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Exam
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Total Score
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Problems
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Solved
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Attempts
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Wrong
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  First Solved
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in filtered"
                :key="`${s.userId}-${s.examId}`"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="viewDetail(s)"
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ s.user?.rollNumber }} - {{ s.user?.firstName }}
                  {{ s.user?.lastName }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ s.exam?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-semibold"
                  :class="
                    scoreColor(s.totalScore) === 'score-high'
                      ? 'text-emerald-500'
                      : scoreColor(s.totalScore) === 'score-mid'
                        ? 'text-amber-500'
                        : 'text-red-400'
                  "
                >
                  {{ s.totalScore.toFixed(2) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ s.problemCount }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  :class="
                    s.solvedCount === s.problemCount
                      ? 'text-emerald-500'
                      : s.solvedCount > 0
                        ? 'text-amber-500'
                        : 'text-slate-900 dark:text-slate-200'
                  "
                >
                  {{ s.solvedCount }}/{{ s.problemCount }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ s.totalAttempts }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  :class="
                    s.totalWrongAttempts > 0
                      ? 'text-red-400'
                      : 'text-slate-900 dark:text-slate-200'
                  "
                >
                  {{ s.totalWrongAttempts }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                >
                  {{ formatDate(s.earliestSolvedAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <div
            v-for="s in filtered"
            :key="`${s.userId}-${s.examId}`"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="viewDetail(s)"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ s.user?.rollNumber }} - {{ s.user?.firstName }}
                {{ s.user?.lastName }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0"
                :class="
                  scoreColor(s.totalScore) === 'score-high'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : scoreColor(s.totalScore) === 'score-mid'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-red-500/10 text-red-400'
                "
                >{{ s.totalScore.toFixed(2) }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-1">
              <div>{{ s.exam?.title ?? '-' }}</div>
              <div>
                Solved: {{ s.solvedCount }}/{{ s.problemCount }} &nbsp;·&nbsp;
                Attempts: {{ s.totalAttempts }} &nbsp;·&nbsp; Wrong:
                {{ s.totalWrongAttempts }}
              </div>
              <div>First solved: {{ formatDate(s.earliestSolvedAt) }}</div>
            </div>
          </div>
        </div>
      </template>

      <TablePagination
        :page="page"
        :total="total"
        :limit="PAGE_LIMIT"
        @update:page="page = $event"
      />
    </template>
  </div>
</template>
