<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { listProblemViews } from '../../services/adminApi';
import type { ProblemView } from '../../types/admin';
import TablePagination from '../../components/shared/TablePagination.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

interface ExamOption {
  id: number;
  title: string;
}

const exams = ref<ExamOption[]>([]);
const examFilter = ref<number | ''>('');
const problemFilter = ref('');

function updateExamOptions(rows: ProblemView[]) {
  const map = new Map<number, ExamOption>();
  for (const e of exams.value) map.set(e.id, e);
  for (const r of rows) {
    const exam = (r as ProblemView & { exam?: { id: number; title: string } })
      .exam;
    if (exam && !map.has(r.examId)) {
      map.set(r.examId, { id: exam.id, title: exam.title });
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
} = usePagination<ProblemView>({
  fetcher: async (params) => {
    const result = await listProblemViews(
      examFilter.value || undefined,
      params,
    );
    updateExamOptions(result.data);
    return result;
  },
});

const examOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All Exams' },
  ...exams.value.map((e) => ({ value: e.id, label: e.title })),
]);

// Server-side filter only on exam dropdown; problem ID filtered client-side
// to avoid NaN query params and race conditions from every-keystroke API calls.
watch(examFilter, resetAndLoad);

const sorted = computed(() => {
  let result = records.value;
  const pid = parseInt(problemFilter.value);
  if (!isNaN(pid)) result = result.filter((r) => r.problemId === pid);
  return [...result].sort(
    (a, b) =>
      new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime(),
  );
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="problem-view-list">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">Problem Views</h2>
        <span class="count-badge">{{ records.length }}</span>
      </div>
      <div class="header-right">
        <div style="width: 200px">
          <RegalSelect
            v-model="examFilter"
            :options="examOptions"
            placeholder="All Exams"
          />
        </div>
        <input
          v-model="problemFilter"
          class="filter-input"
          placeholder="Problem ID"
        />
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <div v-if="sorted.length === 0" class="empty">
        No problem view records found.
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div class="hidden sm:block table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Problem ID</th>
                <th>Exam ID</th>
                <th>User ID</th>
                <th>Views</th>
                <th>First Viewed</th>
                <th>Last Viewed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in sorted" :key="r.id" class="table-row">
                <td>{{ r.problemId }}</td>
                <td>{{ r.examId }}</td>
                <td>{{ r.userId }}</td>
                <td>
                  <span class="view-count">{{ r.viewCount }}</span>
                </td>
                <td class="cell-mono">{{ fmtDate(r.firstViewedAt) }}</td>
                <td class="cell-mono">{{ fmtDate(r.lastViewedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <div
            v-for="r in sorted"
            :key="r.id"
            class="border border-[var(--border)] rounded-xl p-3.5 bg-[var(--bg-primary)]"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="text-sm font-medium text-[var(--text-primary)]">
                Problem #{{ r.problemId }}
              </div>
              <span class="view-count">{{ r.viewCount }}</span>
            </div>
            <div
              class="text-xs space-y-0.5"
              style="color: var(--text-secondary)"
            >
              <div>User: {{ r.userId }} &nbsp;·&nbsp; Exam: {{ r.examId }}</div>
              <div class="cell-mono">First: {{ fmtDate(r.firstViewedAt) }}</div>
              <div class="cell-mono">Last: {{ fmtDate(r.lastViewedAt) }}</div>
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
  </div>
</template>

<style scoped>
.problem-view-list {
  max-width: 1000px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.count-badge {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-select,
.filter-input {
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}
.filter-input {
  width: 110px;
}
.filter-input::placeholder {
  color: var(--text-muted);
}

.loading,
.empty {
  color: var(--text-muted);
  font-size: 14px;
}
.error-msg {
  color: var(--status-error);
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  vertical-align: middle;
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.table-row {
  transition: background 0.1s;
}
.table-row:hover td {
  background: var(--bg-elevated);
}

.cell-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.view-count {
  display: inline-block;
  min-width: 28px;
  text-align: center;
  padding: 2px 8px;
  background: rgb(var(--color-accent) / 0.12);
  color: var(--brand-teal);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 639px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }
  .filter-input {
    flex: 1;
    min-width: 80px;
  }
}
</style>
