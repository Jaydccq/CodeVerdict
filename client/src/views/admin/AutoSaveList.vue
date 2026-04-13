<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { listAutoSaves, deleteAutoSave } from '../../services/adminApi';
import type { AdminAutoSave } from '../../types/admin';
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

const confirmDelete = ref<AdminAutoSave | null>(null);
const deleting = ref(false);

function updateExamOptions(rows: AdminAutoSave[]) {
  const map = new Map<number, ExamOption>();
  for (const e of exams.value) map.set(e.id, e);
  for (const r of rows) {
    if (r.exam && !map.has(r.examId)) {
      map.set(r.examId, { id: r.examId, title: r.exam.title });
    }
  }
  exams.value = [...map.values()].sort((a, b) => a.id - b.id);
}

const {
  items: records,
  page,
  total,
  loading,
  error,
  resetAndLoad,
} = usePagination<AdminAutoSave>({
  fetcher: async (params) => {
    const result = await listAutoSaves(examFilter.value || undefined, params);
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

const filtered = computed(() => {
  if (!search.value) return records.value;
  const q = search.value.toLowerCase();
  return records.value.filter(
    (r) =>
      r.user?.rollNumber?.toLowerCase().includes(q) ||
      r.user?.firstName?.toLowerCase().includes(q) ||
      r.user?.lastName?.toLowerCase().includes(q),
  );
});

async function onDelete() {
  if (!confirmDelete.value) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteAutoSave(id);
    records.value = records.value.filter((r) => r.id !== id);
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete record.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

function problemCount(
  codeState: Record<string, Record<string, string>> | null,
) {
  if (!codeState) return 0;
  return Object.keys(codeState).length;
}

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
  <div class="max-w-[1000px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-center gap-2.5">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          AutoSave Records
        </h2>
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
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="text-sm text-slate-400">
        No autosave records found.
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
                  Problems Saved
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Last Updated
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
                v-for="r in filtered"
                :key="r.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({
                    name: 'admin-autosave-view',
                    params: { id: r.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ r.user?.rollNumber }} - {{ r.user?.firstName }}
                  {{ r.user?.lastName }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ r.exam?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ problemCount(r.codeState) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                  :title="fullDate(r.updatedAt)"
                >
                  {{ timeAgo(r.updatedAt) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-autosave-view',
                          params: { id: r.id },
                        })
                      "
                    >
                      View
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = r">
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
            v-for="r in filtered"
            :key="r.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({ name: 'admin-autosave-view', params: { id: r.id } })
            "
          >
            <div
              class="font-medium text-sm text-slate-900 dark:text-white mb-2"
            >
              {{ r.user?.rollNumber }} - {{ r.user?.firstName }}
              {{ r.user?.lastName }}
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>{{ r.exam?.title ?? '-' }}</div>
              <div>Problems saved: {{ problemCount(r.codeState) }}</div>
              <div :title="fullDate(r.updatedAt)">
                Updated: {{ timeAgo(r.updatedAt) }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-autosave-view',
                    params: { id: r.id },
                  })
                "
                >View</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = r"
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
      title="Delete AutoSave Record"
      :message="`Delete autosave for ${confirmDelete.user?.firstName ?? ''} ${confirmDelete.user?.lastName ?? ''}? This cannot be undone.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
