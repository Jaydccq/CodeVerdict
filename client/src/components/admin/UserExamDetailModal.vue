<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getUserExamDetail } from '../../services/adminApi';
import type { LeaderboardEntry } from '../../types/admin';
import type { UserExamDetail, RunLog } from '../../types/admin';

const props = defineProps<{
  userId: number;
  examId: number;
  entry: LeaderboardEntry | null;
}>();

const emit = defineEmits<{ close: [] }>();

const detail = ref<UserExamDetail | null>(null);
const loading = ref(true);
const error = ref('');
const activeTab = ref<'breakdown' | 'runs' | 'submissions'>('breakdown');

// Track which items have expanded code view
const expandedCode = ref<Record<string, boolean>>({});
function toggleCode(key: string) {
  expandedCode.value[key] = !expandedCode.value[key];
}

onMounted(async () => {
  try {
    detail.value = await getUserExamDetail(props.userId, props.examId);
  } catch {
    error.value = 'Failed to load user detail.';
  } finally {
    loading.value = false;
  }
});

// Per-problem breakdown - join problems with scores, views, run counts, submission counts
const perProblem = computed(() => {
  if (!detail.value) return [];
  const { problems, scores, submissions, runLogs, problemViews } = detail.value;

  return problems.map((p) => {
    const score = scores.find((s) => s.problemId === p.id);
    const views = problemViews.find((v) => v.problemId === p.id);
    const runCount = runLogs.filter((r) => r.problemId === p.id).length;
    const subCount = submissions.filter((s) => s.problemId === p.id).length;

    const status = score?.firstSolvedAt
      ? 'solved'
      : score && score.totalAttempts > 0
        ? 'attempted'
        : 'not attempted';

    return {
      id: p.id,
      title: p.title,
      maxScore: p.maxScore,
      viewCount: views?.viewCount ?? 0,
      runCount,
      subCount,
      bestScore: score?.bestScore ?? 0,
      totalAttempts: score?.totalAttempts ?? 0,
      status,
    };
  });
});

function statusClass(status: string) {
  if (status === 'solved') return 'status-solved';
  if (status === 'attempted') return 'status-attempted';
  return 'status-none';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function shortStdout(log: RunLog) {
  if (!log.results) return '-';
  const passed = log.results.filter((r) => r.passed).length;
  const total = log.results.length;
  if (log.inputType === 'custom') return 'custom input';
  return `${passed}/${total} passed`;
}

function getMcqOptions(problemId: number) {
  return (
    detail.value?.problems.find((p) => p.id === problemId)?.mcqOptions ?? []
  );
}
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="modal" role="dialog">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h3 class="modal-title">
              {{ detail?.user.firstName ?? entry?.firstName }}
              {{ detail?.user.lastName ?? entry?.lastName }}
            </h3>
            <div class="modal-sub">
              {{ detail?.user.rollNumber ?? entry?.rollNumber }}
              &nbsp;·&nbsp;
              {{ detail?.exam.title ?? '' }}
            </div>
          </div>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <!-- Loading / Error -->
        <div v-if="loading" class="state-msg">Loading…</div>
        <div v-else-if="error" class="state-msg error">{{ error }}</div>

        <template v-else-if="detail">
          <!-- Summary row -->
          <div class="summary-row">
            <div class="summary-chip">
              <span class="chip-value"
                >{{ detail.summary.solved }}/{{
                  detail.summary.totalProblems
                }}</span
              >
              <span class="chip-label">Solved</span>
            </div>
            <div class="summary-chip">
              <span class="chip-value">{{ detail.summary.attempted }}</span>
              <span class="chip-label">Attempted</span>
            </div>
            <div class="summary-chip">
              <span class="chip-value">{{
                detail.summary.neverAttempted
              }}</span>
              <span class="chip-label">Not opened</span>
            </div>
            <div class="summary-chip">
              <span class="chip-value">{{ entry?.totalScore ?? '-' }}</span>
              <span class="chip-label">Score</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tab-bar">
            <button
              class="tab"
              :class="{ active: activeTab === 'breakdown' }"
              @click="activeTab = 'breakdown'"
            >
              Per-Problem
            </button>
            <button
              class="tab"
              :class="{ active: activeTab === 'runs' }"
              @click="activeTab = 'runs'"
            >
              Run History ({{ detail.runLogs.length }})
            </button>
            <button
              class="tab"
              :class="{ active: activeTab === 'submissions' }"
              @click="activeTab = 'submissions'"
            >
              Submissions ({{ detail.submissions.length }})
            </button>
          </div>

          <!-- Per-Problem Breakdown -->
          <div v-if="activeTab === 'breakdown'" class="tab-body">
            <div style="overflow-x: auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th class="col-num">Views</th>
                    <th class="col-num">Runs</th>
                    <th class="col-num">Submissions</th>
                    <th class="col-num">Best Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in perProblem" :key="p.id">
                    <td class="cell-title">{{ p.title }}</td>
                    <td class="col-num">{{ p.viewCount }}</td>
                    <td class="col-num">{{ p.runCount }}</td>
                    <td class="col-num">{{ p.subCount }}</td>
                    <td class="col-num cell-score">
                      {{ p.bestScore }}/{{ p.maxScore }}
                    </td>
                    <td>
                      <span class="status-tag" :class="statusClass(p.status)">
                        {{ p.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Run History -->
          <div v-if="activeTab === 'runs'" class="tab-body">
            <div v-if="detail.runLogs.length === 0" class="empty-tab">
              No run logs.
            </div>
            <div
              v-for="(log, i) in detail.runLogs"
              :key="log.id"
              class="log-row"
            >
              <div class="log-meta">
                <span class="log-time">{{ formatTime(log.executedAt) }}</span>
                <span class="log-problem">P{{ log.problemId }}</span>
                <span class="log-lang">{{ log.language }}</span>
                <span
                  class="log-type"
                  :class="
                    log.inputType === 'custom' ? 'type-custom' : 'type-sample'
                  "
                >
                  {{ log.inputType }}
                </span>
                <span class="log-result">{{ shortStdout(log) }}</span>
                <button class="code-toggle" @click="toggleCode(`run-${i}`)">
                  {{ expandedCode[`run-${i}`] ? 'Hide' : 'View Code' }}
                </button>
              </div>
              <pre v-if="expandedCode[`run-${i}`]" class="code-preview">{{
                log.sourceCode
              }}</pre>
            </div>
          </div>

          <!-- Formal Submissions -->
          <div v-if="activeTab === 'submissions'" class="tab-body">
            <div v-if="detail.submissions.length === 0" class="empty-tab">
              No submissions.
            </div>
            <div
              v-for="(sub, i) in detail.submissions"
              :key="sub.id"
              class="log-row"
            >
              <div class="log-meta">
                <span class="log-time">{{ formatTime(sub.submittedAt) }}</span>
                <span class="log-problem">P{{ sub.problemId }}</span>
                <span class="log-lang">{{ sub.language ?? 'MCQ' }}</span>
                <span
                  class="verdict-tag"
                  :class="
                    sub.verdict === 'accepted' ? 'verdict-ac' : 'verdict-wa'
                  "
                  >{{ sub.verdict }}</span
                >
                <span class="log-result">
                  <template v-if="sub.selectedOptionIds != null"
                    >{{ sub.score }} pts</template
                  >
                  <template v-else
                    >{{ sub.passedTestCases }}/{{ sub.totalTestCases }} ·
                    {{ sub.score }} pts</template
                  >
                </span>
                <button class="code-toggle" @click="toggleCode(`sub-${i}`)">
                  {{
                    expandedCode[`sub-${i}`]
                      ? 'Hide'
                      : sub.selectedOptionIds != null
                        ? 'View Answer'
                        : 'View Code'
                  }}
                </button>
              </div>
              <!-- MCQ answer view -->
              <div
                v-if="expandedCode[`sub-${i}`] && sub.selectedOptionIds != null"
                class="mcq-answer-preview"
              >
                <div
                  v-for="opt in getMcqOptions(sub.problemId)"
                  :key="opt.id"
                  class="mcq-opt-row"
                  :class="{
                    'mcq-opt-selected': sub.selectedOptionIds.includes(opt.id),
                    'mcq-opt-correct': opt.isCorrect,
                  }"
                >
                  <span class="mcq-opt-marker">{{
                    sub.selectedOptionIds.includes(opt.id) ? '●' : '○'
                  }}</span>
                  <div class="mcq-opt-body">
                    <img
                      v-if="opt.imageData"
                      :src="`data:image/png;base64,${opt.imageData}`"
                      class="mcq-opt-img"
                      alt="option"
                    />
                    <span class="mcq-opt-text">{{ opt.text }}</span>
                  </div>
                  <span v-if="opt.isCorrect" class="mcq-correct-label"
                    >✓ correct</span
                  >
                </div>
              </div>
              <!-- Code view (for coding submissions) -->
              <pre v-else-if="expandedCode[`sub-${i}`]" class="code-preview">{{
                sub.code
              }}</pre>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 820px;
  max-width: calc(100vw - 24px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* Header */
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
  font-family: var(--font-mono);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 20px;
  line-height: 1;
  padding: 0;
}
.close-btn:hover {
  color: var(--text-primary);
}

/* States */
.state-msg {
  padding: 40px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
.state-msg.error {
  color: var(--status-error);
}

/* Summary */
.summary-row {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.summary-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-right: 1px solid var(--border);
}
.summary-chip:last-child {
  border-right: none;
}

.chip-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.chip-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-top: 2px;
}

/* Tabs */
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  padding: 0 4px;
}

.tab {
  padding: 8px 14px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.1s;
}

.tab:hover {
  color: var(--text-primary);
}
.tab.active {
  color: var(--brand-teal);
  border-bottom-color: var(--brand-teal);
}

/* Tab body */
.tab-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.empty-tab {
  padding: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

/* Data table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th {
  padding: 7px 14px;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  vertical-align: middle;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.col-num {
  text-align: center;
}
.cell-title {
  font-weight: 500;
}
.cell-score {
  font-family: var(--font-mono);
  color: var(--brand-teal);
  font-weight: 600;
}

.status-tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 7px;
  border-radius: 20px;
}
.status-solved {
  background: rgb(var(--color-accent) / 0.15);
  color: var(--status-success);
}
.status-attempted {
  background: rgba(228, 165, 38, 0.15);
  color: #e4a526;
}
.status-none {
  background: var(--bg-secondary);
  color: var(--text-muted);
}

/* Log rows */
.log-row {
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
}
.log-row:last-child {
  border-bottom: none;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  font-size: 12px;
  flex-wrap: wrap;
}

.log-time {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
.log-problem {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
}
.log-lang {
  color: var(--text-secondary);
}
.log-result {
  color: var(--text-secondary);
  margin-left: auto;
}

.log-type {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 20px;
}
.type-sample {
  background: rgba(91, 141, 239, 0.12);
  color: #5b8def;
}
.type-custom {
  background: rgba(228, 165, 38, 0.12);
  color: #e4a526;
}

.verdict-tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 20px;
}
.verdict-ac {
  background: rgb(var(--color-accent) / 0.15);
  color: var(--status-success);
}
.verdict-wa {
  background: rgba(228, 38, 70, 0.12);
  color: var(--status-error);
}

.code-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
  color: var(--text-muted);
}
.code-toggle:hover {
  border-color: var(--brand-teal);
  color: var(--brand-teal);
}

.code-preview {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin: 0 0 10px;
  overflow-x: auto;
  white-space: pre;
  color: var(--text-primary);
}

.mcq-answer-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 10px;
}

.mcq-opt-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-primary);
}

.mcq-opt-selected {
  border-color: rgba(91, 141, 239, 0.4);
  background: rgba(91, 141, 239, 0.06);
  color: var(--text-primary);
}

.mcq-opt-correct {
  border-color: rgb(var(--color-accent) / 0.4);
}

.mcq-opt-selected.mcq-opt-correct {
  border-color: rgb(var(--color-accent) / 0.6);
  background: rgb(var(--color-accent) / 0.08);
}

.mcq-opt-marker {
  flex-shrink: 0;
  font-size: 10px;
  margin-top: 1px;
  color: var(--text-muted);
}

.mcq-opt-selected .mcq-opt-marker {
  color: #5b8def;
}

.mcq-opt-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.mcq-opt-img {
  max-height: 80px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.mcq-opt-text {
  font-size: 12px;
  line-height: 1.4;
}

.mcq-correct-label {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--status-success);
  padding: 1px 6px;
  border-radius: 20px;
  background: rgb(var(--color-accent) / 0.12);
  margin-left: auto;
}

@media (max-width: 639px) {
  .modal {
    max-width: calc(100vw - 16px);
    max-height: 92vh;
  }
  .modal-header {
    padding: 14px 14px 12px;
  }
  .tab {
    padding: 8px 10px;
    font-size: 11px;
  }
  .tab-bar {
    overflow-x: auto;
  }
  .summary-chip {
    padding: 10px 4px;
  }
  .chip-value {
    font-size: 15px;
  }
  .data-table th,
  .data-table td {
    padding: 7px 10px;
  }
  .log-meta {
    gap: 6px;
  }
}
</style>
