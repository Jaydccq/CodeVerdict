<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { listAllTestCases, deleteTestCase } from '../../services/adminApi';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';
import TablePagination from '../../components/shared/TablePagination.vue';
import { usePagination } from '../../composables/usePagination';
import type { TestCaseRow } from '../../types/admin';
import { PAGE_LIMIT } from '../../constants';

const router = useRouter();
const allProblems = ref<NonNullable<TestCaseRow['problem']>[]>([]);
const search = ref('');
const problemFilter = ref<number | ''>('');

const confirmDelete = ref<TestCaseRow | null>(null);
const deleting = ref(false);

function updateProblemOptions(rows: TestCaseRow[]) {
  const map = new Map<number, NonNullable<TestCaseRow['problem']>>();
  for (const tc of rows) {
    if (tc.problem && !map.has(tc.problem.id)) {
      map.set(tc.problem.id, tc.problem);
    }
  }
  // Merge with existing to accumulate across pages
  for (const p of allProblems.value) {
    if (p && !map.has(p.id)) map.set(p.id, p);
  }
  allProblems.value = [...map.values()].sort((a, b) => a.id - b.id);
}

const {
  items: testCases,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<TestCaseRow>({
  fetcher: async (params) => {
    const result = await listAllTestCases(
      problemFilter.value || undefined,
      params,
    );
    updateProblemOptions(result.data);
    return result;
  },
});

const problemOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All Problems' },
  ...allProblems.value.map((p) => ({
    value: p.id,
    label: p.exam?.title ? `[${p.exam.title}] ${p.title}` : p.title,
  })),
]);

function onProblemChange() {
  resetAndLoad();
}

const filtered = computed(() => {
  if (!search.value) return testCases.value;
  const q = search.value.toLowerCase();
  return testCases.value.filter(
    (tc) =>
      tc.problem?.title?.toLowerCase().includes(q) ||
      tc.problem?.exam?.title?.toLowerCase().includes(q) ||
      tc.input.toLowerCase().includes(q) ||
      tc.expectedOutput.toLowerCase().includes(q),
  );
});

async function onDelete() {
  if (!confirmDelete.value?.id) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteTestCase(id);
    testCases.value = testCases.value.filter((tc) => tc.id !== id);
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete test case.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

function truncate(str: string, len = 50) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
</script>

<template>
  <div class="max-w-[1100px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          All Test Cases
        </h2>
        <span
          class="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500"
          >{{ filtered.length }}</span
        >
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="sm:w-56 w-full">
          <RegalSelect
            v-model="problemFilter"
            :options="problemOptions"
            placeholder="All Problems"
            searchable
            @change="onProblemChange"
          />
        </div>
        <input
          v-model="search"
          class="w-full sm:w-44 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          placeholder="Search…"
        />
        <RegalButton
          variant="primary"
          size="sm"
          @click="router.push({ name: 'admin-testcase-create' })"
        >
          + Add Test Case
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="text-sm text-slate-400">
        No test cases found.
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
                  Problem
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Exam
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  #
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Input
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Expected Output
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Visible
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
                v-for="tc in filtered"
                :key="tc.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({
                    name: 'admin-testcase-edit',
                    params: { id: tc.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ tc.problem?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ tc.problem?.exam?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                >
                  {{ tc.displayOrder }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {{ truncate(tc.input) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {{ truncate(tc.expectedOutput) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    :class="
                      tc.isVisible
                        ? 'text-emerald-500 font-semibold'
                        : 'text-slate-400'
                    "
                    >{{ tc.isVisible ? '✓' : '✗' }}</span
                  >
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-testcase-edit',
                          params: { id: tc.id },
                        })
                      "
                    >
                      Edit
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = tc">
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
            v-for="tc in filtered"
            :key="tc.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({
                name: 'admin-testcase-edit',
                params: { id: tc.id },
              })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ tc.problem?.title ?? '-' }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0"
                :class="
                  tc.isVisible
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-slate-500/10 text-slate-400'
                "
                >{{ tc.isVisible ? 'Visible' : 'Hidden' }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>
                {{ tc.problem?.exam?.title ?? '-' }} &nbsp;·&nbsp; Order:
                {{ tc.displayOrder }}
              </div>
              <div class="font-mono truncate">
                In: {{ truncate(tc.input, 40) }}
              </div>
              <div class="font-mono truncate">
                Out: {{ truncate(tc.expectedOutput, 40) }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-testcase-edit',
                    params: { id: tc.id },
                  })
                "
                >Edit</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = tc"
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
      title="Delete Test Case"
      :message="`Delete test case #${confirmDelete.displayOrder} from &quot;${confirmDelete.problem?.title ?? 'unknown'}&quot;?`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
