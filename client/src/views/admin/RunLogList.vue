<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { listRunLogs } from '../../services/adminApi';
import type { RunLog } from '../../types/admin';
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
const userFilter = ref('');
const expandedId = ref<number | null>(null);

function updateExamOptions(rows: RunLog[]) {
  const map = new Map<number, ExamOption>();
  for (const e of exams.value) map.set(e.id, e);
  for (const r of rows) {
    const exam = (r as RunLog & { exam?: { id: number; title: string } }).exam;
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
} = usePagination<RunLog>({
  fetcher: async (params) => {
    const result = await listRunLogs(examFilter.value || undefined, params);
    updateExamOptions(result.data);
    return result;
  },
});

const examOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'All Exams' },
  ...exams.value.map((e) => ({ value: e.id, label: e.title })),
]);

// Server-side filter only on exam dropdown; problem/user ID filtered client-side
// to avoid NaN query params and race conditions from every-keystroke API calls.
watch(examFilter, resetAndLoad);

const filtered = computed(() => {
  let result = records.value;
  const pid = parseInt(problemFilter.value);
  if (!isNaN(pid)) result = result.filter((r) => r.problemId === pid);
  const uid = parseInt(userFilter.value);
  if (!isNaN(uid)) result = result.filter((r) => r.userId === uid);
  return result;
});

function toggleCode(id: number) {
  expandedId.value = expandedId.value === id ? null : id;
}

function resultSummary(r: RunLog) {
  if (r.inputType === 'custom') return 'custom input';
  if (!r.results) return '-';
  const passed = r.results.filter((x) => x.passed).length;
  return `${passed}/${r.results.length} passed`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString();
}
</script>

<template>
  <div class="run-log-list">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">Run Logs</h2>
        <span class="count-badge">{{ filtered.length }}</span>
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
        <input
          v-model="userFilter"
          class="filter-input"
          placeholder="User ID"
        />
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="empty">No run logs found.</div>

      <template v-else>
        <!-- Desktop table -->
        <div class="hidden sm:block table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Problem</th>
                <th>User</th>
                <th>Language</th>
                <th>Input Type</th>
                <th>Result</th>
                <th>Code</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="r in filtered" :key="r.id">
                <tr class="table-row">
                  <td class="cell-mono">{{ fmtTime(r.executedAt) }}</td>
                  <td>{{ r.problemId }}</td>
                  <td>{{ r.userId }}</td>
                  <td>{{ r.language }}</td>
                  <td>
                    <span
                      :class="[
                        'type-badge',
                        r.inputType === 'sample'
                          ? 'type-sample'
                          : 'type-custom',
                      ]"
                    >
                      {{ r.inputType }}
                    </span>
                  </td>
                  <td>{{ resultSummary(r) }}</td>
                  <td>
                    <button class="btn btn-sm" @click="toggleCode(r.id)">
                      {{ expandedId === r.id ? 'Hide' : 'View Code' }}
                    </button>
                  </td>
                </tr>
                <tr v-if="expandedId === r.id" class="code-row">
                  <td colspan="7">
                    <pre class="code-block">{{ r.sourceCode }}</pre>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <template v-for="r in filtered" :key="r.id">
            <div
              class="border border-[var(--border)] rounded-xl p-3.5 bg-[var(--bg-primary)]"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <div
                  class="text-sm font-medium text-[var(--text-primary)] font-mono"
                >
                  {{ r.problemId }}
                </div>
                <span
                  :class="[
                    'type-badge',
                    r.inputType === 'sample' ? 'type-sample' : 'type-custom',
                  ]"
                  >{{ r.inputType }}</span
                >
              </div>
              <div
                class="text-xs text-[var(--text-secondary)] space-y-0.5 mb-3"
              >
                <div>User: {{ r.userId }} &nbsp;·&nbsp; {{ r.language }}</div>
                <div class="cell-mono">{{ fmtTime(r.executedAt) }}</div>
                <div>{{ resultSummary(r) }}</div>
              </div>
              <button class="btn btn-sm" @click="toggleCode(r.id)">
                {{ expandedId === r.id ? 'Hide' : 'View Code' }}
              </button>
              <div v-if="expandedId === r.id" class="mt-2">
                <pre class="code-block">{{ r.sourceCode }}</pre>
              </div>
            </div>
          </template>
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
.run-log-list {
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
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
  flex-wrap: wrap;
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

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.type-sample {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}
.type-custom {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.code-row td {
  padding: 0;
  background: var(--bg-secondary);
}
.code-block {
  margin: 0;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

@media (max-width: 639px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-right {
    width: 100%;
  }
  .filter-input {
    flex: 1;
    min-width: 80px;
  }
}
</style>
