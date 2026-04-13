<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  getLeaderboard,
  getLeaderboardLive,
  refreshLeaderboard,
  getExam,
} from '../../services/adminApi';
import UserExamDetailModal from '../../components/admin/UserExamDetailModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import type { LeaderboardEntry } from '../../types/admin';
import type { Problem } from '../../types';

const route = useRoute();
const examId = parseInt(String(route.params.examId), 10);

const entries = ref<LeaderboardEntry[]>([]);
const problems = ref<Problem[]>([]);
const examTitle = ref('');
const loading = ref(true);
const refreshing = ref(false);
const error = ref('');
const lastRefreshed = ref<Date | null>(null);
const qaFilterOnly = ref(false);

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

const selectedEntry = ref<LeaderboardEntry | null>(null);

function openUserDetail(entry: LeaderboardEntry) {
  selectedEntry.value = entry;
}

function closeUserDetail() {
  selectedEntry.value = null;
}

// Dynamic problem columns from the leaderboard data
const problemColumns = computed(() => {
  if (problems.value.length > 0) {
    return [...problems.value].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  // Fallback: derive from first entry's problemScores keys
  if (entries.value.length === 0) return [];
  const keys = Object.keys(entries.value[0].problemScores);
  return keys.map((k) => ({
    id: parseInt(k, 10),
    title: `P${k}`,
    displayOrder: 0,
  })) as Problem[];
});

// Sorted entries: solvedCount DESC, totalPenaltyTime ASC, lastSolvedAt ASC
const sortedEntries = computed(() =>
  [...entries.value].sort((a, b) => {
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    if (a.totalPenaltyTime !== b.totalPenaltyTime)
      return a.totalPenaltyTime - b.totalPenaltyTime;
    const aTime = a.lastSolvedAt ? new Date(a.lastSolvedAt).getTime() : 0;
    const bTime = b.lastSolvedAt ? new Date(b.lastSolvedAt).getTime() : 0;
    return aTime - bTime;
  }),
);

async function load(silent = false) {
  if (!silent) loading.value = true;
  error.value = '';
  try {
    const qaOpts = qaFilterOnly.value ? { qaRoleOptIn: true } : undefined;
    const [lb, exam] = await Promise.all([
      getLeaderboard(examId, qaOpts),
      getExam(examId),
    ]);
    // Fallback to live query for inactive exams with no materialized data
    entries.value =
      lb.length > 0 || exam.isActive
        ? lb
        : await getLeaderboardLive(examId, qaOpts);
    problems.value = exam.problems as unknown as Problem[];
    examTitle.value = exam.title;
    lastRefreshed.value = new Date();
  } catch {
    error.value = 'Failed to load leaderboard.';
  } finally {
    loading.value = false;
  }
}

async function manualRefresh() {
  refreshing.value = true;
  try {
    await refreshLeaderboard(examId);
    await load(true);
  } finally {
    refreshing.value = false;
  }
}

function problemScore(entry: LeaderboardEntry, problemId: number) {
  const s = entry.problemScores[String(problemId)];
  if (!s) return '–';
  if (s.solved) return `✓ ${s.score}`;
  return s.attempts > 0 ? `✗ (${s.attempts})` : '–';
}

function problemCellClass(entry: LeaderboardEntry, problemId: number) {
  const s = entry.problemScores[String(problemId)];
  if (!s || s.attempts === 0) return '';
  return s.solved ? 'cell-solved' : 'cell-failed';
}

function formatPenalty(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function exportCsv() {
  const cols = problemColumns.value;
  const headers = [
    'Rank',
    'Roll Number',
    'Name',
    'Solved',
    'Score',
    'Penalty (min)',
    ...cols.map((p) => p.title),
  ];

  const rows = sortedEntries.value.map((entry, i) => [
    i + 1,
    entry.rollNumber,
    `${entry.firstName} ${entry.lastName}`,
    entry.solvedCount,
    entry.totalScore,
    Number(entry.totalPenaltyTime).toFixed(1),
    ...cols.map((p) => {
      const s = entry.problemScores[String(p.id)];
      return s?.solved ? s.score : 0;
    }),
  ]);

  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `leaderboard-${examTitle.value.replace(/\s+/g, '-')}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toggleQaFilter() {
  qaFilterOnly.value = !qaFilterOnly.value;
  void load();
}

async function exportQaReport() {
  // Fetch QA-only leaderboard and export as CSV
  let qaEntries: LeaderboardEntry[];
  try {
    const qaOpts = { qaRoleOptIn: true };
    qaEntries = await getLeaderboard(examId, qaOpts);
    if (qaEntries.length === 0) {
      qaEntries = await getLeaderboardLive(examId, qaOpts);
    }
  } catch {
    return;
  }

  const cols = problemColumns.value;
  const headers = [
    'Rank',
    'Roll Number',
    'Name',
    'Solved',
    'Score',
    'Penalty (min)',
    ...cols.map((p) => p.title),
  ];

  const sorted = [...qaEntries].sort((a, b) => {
    if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
    if (a.totalPenaltyTime !== b.totalPenaltyTime)
      return a.totalPenaltyTime - b.totalPenaltyTime;
    const aTime = a.lastSolvedAt ? new Date(a.lastSolvedAt).getTime() : 0;
    const bTime = b.lastSolvedAt ? new Date(b.lastSolvedAt).getTime() : 0;
    return aTime - bTime;
  });

  const rows = sorted.map((entry, i) => [
    i + 1,
    entry.rollNumber,
    `${entry.firstName} ${entry.lastName}`,
    entry.solvedCount,
    entry.totalScore,
    Number(entry.totalPenaltyTime).toFixed(1),
    ...cols.map((p) => {
      const s = entry.problemScores[String(p.id)];
      return s?.solved ? s.score : 0;
    }),
  ]);

  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `qa-leaderboard-${examTitle.value.replace(/\s+/g, '-')}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

onMounted(() => {
  void load();
  autoRefreshTimer = setInterval(() => void load(true), 30_000);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});
</script>

<template>
  <div class="max-w-[1200px]">
    <div
      class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3"
    >
      <div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          Leaderboard
        </h2>
        <p v-if="examTitle" class="text-[13px] text-slate-500 mt-0.5">
          {{ examTitle }}
        </p>
      </div>
      <div class="flex items-center gap-2.5 flex-wrap">
        <span v-if="lastRefreshed" class="text-xs text-slate-400">
          Updated
          {{
            lastRefreshed.toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })
          }}
        </span>
        <RegalButton size="sm" :disabled="refreshing" @click="manualRefresh">
          {{ refreshing ? 'Refreshing…' : '↺ Refresh Now' }}
        </RegalButton>
        <button
          class="px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors"
          :class="
            qaFilterOnly
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : 'bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-purple-500/30 hover:text-purple-400'
          "
          @click="toggleQaFilter"
        >
          QA Only
        </button>
        <RegalButton
          variant="primary"
          size="sm"
          :disabled="entries.length === 0"
          @click="exportCsv"
        >
          ↓ Export CSV
        </RegalButton>
        <RegalButton
          size="sm"
          :disabled="entries.length === 0"
          @click="exportQaReport"
        >
          ↓ Export QA Report
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="entries.length === 0" class="text-sm text-slate-400">
        No submissions yet.
      </div>

      <div
        v-else
        class="overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
      >
        <table class="w-full text-[13px]">
          <thead>
            <tr>
              <th
                class="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] w-[50px] whitespace-nowrap"
              >
                #
              </th>
              <th
                class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap"
              >
                Roll No.
              </th>
              <th
                class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap"
              >
                Name
              </th>
              <th
                class="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap"
              >
                Solved
              </th>
              <th
                class="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap"
              >
                Score
              </th>
              <th
                class="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap"
              >
                Penalty
              </th>
              <th
                v-for="p in problemColumns"
                :key="p.id"
                class="px-3.5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] whitespace-nowrap min-w-[80px]"
              >
                {{ p.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, i) in sortedEntries"
              :key="entry.userId"
              class="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
              :class="{
                'bg-yellow-400/[0.04]': i + 1 === 1,
                'bg-slate-300/[0.04]': i + 1 === 2,
                'bg-amber-600/[0.04]': i + 1 === 3,
              }"
              @click="openUserDetail(entry)"
            >
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle text-center"
              >
                <span
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  :class="{
                    'bg-yellow-400/20 text-yellow-400': i + 1 === 1,
                    'bg-slate-300/20 text-slate-300': i + 1 === 2,
                    'bg-amber-600/20 text-amber-600': i + 1 === 3,
                    'bg-white/[0.06] text-slate-500': i + 1 > 3,
                  }"
                  >{{ i + 1 }}</span
                >
              </td>
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
              >
                {{ entry.rollNumber }}
              </td>
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
              >
                {{ entry.firstName }} {{ entry.lastName }}
              </td>
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle text-center"
              >
                {{ entry.solvedCount }}
              </td>
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle text-center font-bold text-primary"
              >
                {{ entry.totalScore }}
              </td>
              <td
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle text-center font-mono text-xs text-slate-500"
              >
                {{ formatPenalty(entry.totalPenaltyTime) }}
              </td>
              <td
                v-for="p in problemColumns"
                :key="p.id"
                class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle text-center font-mono text-xs"
                :class="{
                  'text-emerald-500':
                    problemCellClass(entry, p.id!) === 'cell-solved',
                  'text-red-400 opacity-70':
                    problemCellClass(entry, p.id!) === 'cell-failed',
                  'text-slate-900 dark:text-slate-200':
                    problemCellClass(entry, p.id!) === '',
                }"
              >
                {{ problemScore(entry, p.id!) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <UserExamDetailModal
    v-if="selectedEntry"
    :user-id="selectedEntry.userId"
    :exam-id="examId"
    :entry="selectedEntry"
    @close="closeUserDetail"
  />
</template>
