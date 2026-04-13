<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { listAllProblems, deleteProblem } from '../../services/adminApi';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import TablePagination from '../../components/shared/TablePagination.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

interface ProblemRow {
  id: number;
  title: string;
  displayOrder: number;
  difficulty: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  maxScore: number;
  testCases?: unknown[];
}

const router = useRouter();

const search = ref('');

const {
  items: problems,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<ProblemRow>({
  fetcher: (params) =>
    listAllProblems(undefined, {
      ...params,
      search: search.value || undefined,
    }),
});

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(resetAndLoad, 300);
});

const confirmDelete = ref<ProblemRow | null>(null);
const deleting = ref(false);

async function onDelete() {
  if (!confirmDelete.value) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteProblem(id);
    problems.value = problems.value.filter((p) => p.id !== id);
    total.value--;
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete problem.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

const difficultyClass: Record<string, string> = {
  easy: 'bg-emerald-500/10 text-emerald-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  hard: 'bg-red-500/10 text-red-400',
};
</script>

<template>
  <div class="max-w-[1200px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          All Problems
        </h2>
        <span
          class="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500"
          >{{ total }}</span
        >
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <input
          v-model="search"
          class="w-full sm:w-44 px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white text-[13px] placeholder-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none"
          placeholder="Search…"
        />
        <RegalButton
          variant="primary"
          size="sm"
          @click="router.push({ name: 'admin-all-problem-create' })"
        >
          + Add Problem
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="problems.length === 0" class="text-sm text-slate-400">
        No problems yet.
      </div>

      <template v-else>
        <!-- Desktop table (hidden on mobile) -->
        <div
          class="hidden sm:block overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <table class="w-full text-[13px]">
            <thead>
              <tr>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Title
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Difficulty
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Time Limit
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Memory
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Max Score
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Test Cases
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in problems"
                :key="p.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({
                    name: 'admin-all-problem-edit',
                    params: { id: p.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ p.title }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
                    :class="difficultyClass[p.difficulty] ?? ''"
                    >{{ p.difficulty }}</span
                  >
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ p.timeLimitMs }}ms
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ Math.round(p.memoryLimitKb / 1024) }} MB
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ p.maxScore }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ p.testCases?.length ?? 0 }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-all-problem-edit',
                          params: { id: p.id },
                        })
                      "
                    >
                      Edit
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = p">
                      Delete
                    </RegalButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <div
            v-for="p in problems"
            :key="p.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({
                name: 'admin-all-problem-edit',
                params: { id: p.id },
              })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ p.title }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide flex-shrink-0"
                :class="difficultyClass[p.difficulty] ?? ''"
                >{{ p.difficulty }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>
                Time: {{ p.timeLimitMs }}ms &nbsp;·&nbsp; Memory:
                {{ Math.round(p.memoryLimitKb / 1024) }}MB &nbsp;·&nbsp; Score:
                {{ p.maxScore }}
              </div>
              <div>Test cases: {{ p.testCases?.length ?? 0 }}</div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-all-problem-edit',
                    params: { id: p.id },
                  })
                "
                >Edit</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = p"
                >Delete</RegalButton
              >
            </div>
          </div>
        </div>
      </template>
    </template>

    <TablePagination
      :page="page"
      :total="total"
      :limit="PAGE_LIMIT"
      @update:page="page = $event"
    />

    <ConfirmModal
      v-if="confirmDelete"
      title="Delete Problem"
      :message="`Delete &quot;${confirmDelete.title}&quot;? This will also remove all test cases.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
