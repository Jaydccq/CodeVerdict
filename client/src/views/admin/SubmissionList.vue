<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { listSubmissions, deleteSubmission } from '../../services/adminApi';
import type { AdminSubmission } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
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

const confirmDelete = ref<AdminSubmission | null>(null);
const deleting = ref(false);

function updateExamOptions(rows: AdminSubmission[]) {
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
  items: submissions,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<AdminSubmission>({
  fetcher: async (params) => {
    const result = await listSubmissions(examFilter.value || undefined, {
      ...params,
      search: search.value || undefined,
    });
    updateExamOptions(result.data);
    return result;
  },
});

const examOptions = ref<SelectOption[]>([]);
watch(
  exams,
  (val) => {
    examOptions.value = [
      { value: '', label: 'All Exams' },
      ...val.map((e) => ({ value: e.id, label: e.title })),
    ];
  },
  { immediate: true },
);

function onExamChange() {
  resetAndLoad();
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(resetAndLoad, 300);
});

async function onDelete() {
  if (!confirmDelete.value) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteSubmission(id);
    submissions.value = submissions.value.filter((s) => s.id !== id);
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete submission.';
    confirmDelete.value = null;
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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="max-w-[1200px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          Submissions
        </h2>
        <span
          class="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-full px-2 py-0.5 text-xs font-semibold text-slate-500"
          >{{ total }}</span
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
          class="w-full sm:w-44 px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white text-[13px] placeholder-slate-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none"
          placeholder="Search…"
        />
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="submissions.length === 0" class="text-sm text-slate-400">
        No submissions found.
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
                  #
                </th>
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
                  Problem
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Lang
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Verdict
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Score
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Tests
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Submitted
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
                v-for="s in submissions"
                :key="s.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({
                    name: 'admin-submission-view',
                    params: { id: s.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ s.id }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ s.user?.rollNumber }} - {{ s.user?.firstName }}
                  {{ s.user?.lastName }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {{ s.exam?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ s.problem?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    v-if="s.selectedOptionIds != null"
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                    >MCQ</span
                  >
                  <template v-else>{{ s.language }}</template>
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide"
                    :class="
                      verdictClass[s.verdict] ??
                      'bg-slate-500/10 text-slate-400'
                    "
                  >
                    {{ s.verdict?.replace(/_/g, ' ') }}
                  </span>
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-semibold"
                >
                  {{ Number(s.score).toFixed(2) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  :class="
                    s.selectedOptionIds != null
                      ? 'text-slate-400'
                      : s.passedTestCases === s.totalTestCases
                        ? 'text-emerald-500'
                        : 'text-slate-900 dark:text-slate-200'
                  "
                >
                  <template v-if="s.selectedOptionIds != null">-</template>
                  <template v-else
                    >{{ s.passedTestCases }}/{{ s.totalTestCases }}</template
                  >
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                  :title="fullDate(s.submittedAt)"
                >
                  {{ timeAgo(s.submittedAt) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-submission-view',
                          params: { id: s.id },
                        })
                      "
                    >
                      View
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = s">
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
            v-for="s in submissions"
            :key="s.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({
                name: 'admin-submission-view',
                params: { id: s.id },
              })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ s.user?.rollNumber }} - {{ s.user?.firstName }}
                {{ s.user?.lastName }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide flex-shrink-0"
                :class="
                  verdictClass[s.verdict] ?? 'bg-slate-500/10 text-slate-400'
                "
                >{{ s.verdict?.replace(/_/g, ' ') }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>
                {{ s.problem?.title ?? '-' }} &nbsp;·&nbsp;
                {{ s.exam?.title ?? '-' }}
              </div>
              <div>
                {{ s.selectedOptionIds != null ? 'MCQ' : s.language }}
                &nbsp;·&nbsp; Score: {{ Number(s.score).toFixed(2)
                }}<template v-if="s.selectedOptionIds == null">
                  &nbsp;·&nbsp; Tests: {{ s.passedTestCases }}/{{
                    s.totalTestCases
                  }}</template
                >
              </div>
              <div>{{ timeAgo(s.submittedAt) }}</div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-submission-view',
                    params: { id: s.id },
                  })
                "
                >View</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = s"
                >Delete</RegalButton
              >
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

    <ConfirmModal
      v-if="confirmDelete"
      title="Delete Submission"
      :message="`Delete submission #${confirmDelete.id}? This cannot be undone.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
