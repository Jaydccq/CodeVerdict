<script setup lang="ts">
import { computed } from 'vue';
import { useProblemsStore } from '../../stores/problems';
import { useEditorStore } from '../../stores/editor';
import { useUiStore } from '../../stores/ui';
import { useExamStore } from '../../stores/exam';
import { useMcqStore } from '../../stores/mcq';
import type { Problem } from '../../types';

const problemsStore = useProblemsStore();
const editorStore = useEditorStore();
const uiStore = useUiStore();
const examStore = useExamStore();
const mcqStore = useMcqStore();

const codingProblems = computed(() =>
  problemsStore.problems.filter((p) => p.questionType !== 'mcq'),
);

const mcqProblems = computed(() =>
  problemsStore.problems.filter((p) => p.questionType === 'mcq'),
);

const hasMcq = computed(() => mcqProblems.value.length > 0);

const mcqSectionSubmitted = computed(
  () => mcqStore.mcqSectionSubmitted || examStore.mcqSectionSubmitted,
);

const mcqAnsweredCount = computed(
  () =>
    mcqProblems.value.filter((p) => (mcqStore.mcqDrafts[p.id]?.length ?? 0) > 0)
      .length,
);

const totalUnits = computed(
  () =>
    examStore.myProgress?.totalProblems ??
    codingProblems.value.length + (hasMcq.value ? 1 : 0),
);
const solvedUnits = computed(() => examStore.myProgress?.solvedProblems ?? 0);

const currentProblem = computed(() => {
  if (!editorStore.activeProblemId) return null;
  return (
    problemsStore.problems.find((p) => p.id === editorStore.activeProblemId) ??
    null
  );
});

const activeProblemDetail = computed(() => {
  if (!editorStore.activeProblemId) return null;
  return problemsStore.getProblemDetail(editorStore.activeProblemId);
});

function onSelectCodingProblem(p: Problem) {
  const detail = problemsStore.getProblemDetail(p.id);
  editorStore.setActiveProblem(p.id, detail ?? p);
  uiStore.setActiveTab('code-editor');
}

function onSelectMcqSection() {
  editorStore.setActiveMcqSection(true);
  uiStore.setActiveTab('code-editor');
}
</script>

<template>
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-[14px] text-slate-500">
          format_list_numbered
        </span>
        <span
          class="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
        >
          Problems
        </span>
        <span v-if="totalUnits > 0" class="count-badge">
          {{ solvedUnits }}/{{ totalUnits }}
        </span>
      </div>
      <button
        class="collapse-btn"
        title="Collapse"
        @click="uiStore.setSidebarCollapsed(true)"
      >
        <span class="material-symbols-outlined text-[14px]">chevron_left</span>
      </button>
    </div>

    <!-- Progress bar -->
    <div v-if="totalUnits > 0" class="px-3 pb-2">
      <div
        class="h-[3px] rounded-full bg-slate-200 dark:bg-white/[0.04] overflow-hidden"
      >
        <div
          class="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
          :style="{ width: `${(solvedUnits / totalUnits) * 100}%` }"
        />
      </div>
    </div>

    <!-- Problem list -->
    <div
      class="flex-shrink-0 border-b border-slate-200 dark:border-white/[0.06]"
    >
      <div
        class="overflow-y-auto py-1 px-1.5 sidebar-scroll"
        style="max-height: min(240px, 40vh)"
      >
        <!-- Empty state -->
        <div
          v-if="problemsStore.problems.length === 0"
          class="px-3 py-8 flex flex-col items-center gap-3 text-center"
        >
          <div
            class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center"
          >
            <span class="material-symbols-outlined text-[20px] text-slate-600">
              format_list_numbered
            </span>
          </div>
          <div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              Call GET /api/exams/<span class="text-slate-400">{{
                examStore.activeExam?.id ?? ':id'
              }}</span
              >/problems
            </p>
            <p class="text-[10px] text-slate-600 mt-1">to load problems</p>
          </div>
        </div>

        <!-- Coding problem items -->
        <button
          v-for="(p, index) in codingProblems"
          :key="p.id"
          class="problem-item"
          :class="[
            examStore.solvedProblemIds.includes(p.id)
              ? 'problem-solved'
              : editorStore.activeProblemId === p.id
                ? 'problem-active'
                : 'problem-idle',
          ]"
          :style="{ animationDelay: `${index * 40}ms` }"
          @click="onSelectCodingProblem(p)"
        >
          <!-- Active indicator bar -->
          <span
            class="active-bar"
            :class="
              editorStore.activeProblemId === p.id &&
              !examStore.solvedProblemIds.includes(p.id)
                ? 'opacity-100'
                : 'opacity-0'
            "
          />

          <!-- Solved checkmark or order badge -->
          <span
            v-if="examStore.solvedProblemIds.includes(p.id)"
            class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-emerald-500/10"
          >
            <span class="material-symbols-outlined text-[14px] text-emerald-400"
              >check</span
            >
          </span>
          <span
            v-else
            class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono"
            :class="
              editorStore.activeProblemId === p.id
                ? 'bg-primary/15 text-primary'
                : 'bg-slate-200/60 dark:bg-white/[0.04] text-slate-500'
            "
            >{{ p.displayOrder }}</span
          >

          <!-- Title -->
          <span class="text-[12px] truncate flex-1 text-left leading-tight">{{
            p.title
          }}</span>

          <!-- Solved indicator dot -->
          <span
            v-if="examStore.solvedProblemIds.includes(p.id)"
            class="w-1.5 h-1.5 rounded-full bg-emerald-400/60 flex-shrink-0"
          />
        </button>

        <!-- Divider before MCQ section -->
        <div
          v-if="hasMcq && codingProblems.length > 0"
          class="mx-2 my-2 h-px bg-slate-200 dark:bg-white/[0.05]"
        />

        <!-- Single MCQ Section entry -->
        <button
          v-if="hasMcq"
          class="problem-item mcq-section-item"
          :class="[
            mcqSectionSubmitted
              ? 'problem-solved'
              : editorStore.activeMcqSection
                ? 'problem-active'
                : 'problem-idle',
          ]"
          @click="onSelectMcqSection"
        >
          <span
            class="active-bar"
            :class="
              editorStore.activeMcqSection && !mcqSectionSubmitted
                ? 'opacity-100'
                : 'opacity-0'
            "
          />

          <!-- Icon -->
          <span
            v-if="mcqSectionSubmitted"
            class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-violet-500/10"
          >
            <span class="material-symbols-outlined text-[14px] text-violet-400"
              >check_circle</span
            >
          </span>
          <span
            v-else
            class="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center"
            :class="
              editorStore.activeMcqSection
                ? 'bg-primary/15'
                : 'bg-violet-100 dark:bg-violet-500/10'
            "
          >
            <span
              class="material-symbols-outlined text-[13px]"
              :class="
                editorStore.activeMcqSection
                  ? 'text-primary'
                  : 'text-violet-500 dark:text-violet-400'
              "
              >quiz</span
            >
          </span>

          <!-- Label -->
          <span
            class="text-[12px] truncate flex-1 text-left leading-tight font-medium"
          >
            MCQ Section
          </span>

          <!-- Status info -->
          <span
            v-if="mcqSectionSubmitted"
            class="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          >
            Done
          </span>
          <span
            v-else-if="mcqAnsweredCount > 0"
            class="flex-shrink-0 text-[9px] font-bold tabular-nums text-slate-400"
          >
            {{ mcqAnsweredCount }}/{{ mcqProblems.length }}
          </span>
          <span
            v-else
            class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
            >MCQ</span
          >
        </button>
      </div>
    </div>

    <!-- Problem detail panel -->
    <div class="flex-1 overflow-y-auto sidebar-scroll">
      <!-- Detail loaded -->
      <template v-if="activeProblemDetail">
        <!-- Title + difficulty -->
        <div class="detail-header">
          <h3 class="detail-title">{{ currentProblem?.title }}</h3>
          <span
            v-if="currentProblem?.difficulty"
            class="difficulty-badge"
            :class="`diff-${currentProblem.difficulty}`"
            >{{ currentProblem.difficulty }}</span
          >
        </div>

        <div class="detail-body">
          <div v-if="activeProblemDetail.description" class="section">
            <div class="section-label">Description</div>
            <pre class="text-block">{{ activeProblemDetail.description }}</pre>
          </div>
          <div v-if="activeProblemDetail.inputFormat" class="section">
            <div class="section-label">Input Format</div>
            <pre class="text-block">{{ activeProblemDetail.inputFormat }}</pre>
          </div>
          <div v-if="activeProblemDetail.outputFormat" class="section">
            <div class="section-label">Output Format</div>
            <pre class="text-block">{{ activeProblemDetail.outputFormat }}</pre>
          </div>
          <div v-if="activeProblemDetail.constraints" class="section">
            <div class="section-label">Constraints</div>
            <pre class="text-block">{{ activeProblemDetail.constraints }}</pre>
          </div>
          <div
            v-if="
              activeProblemDetail.sampleInput ||
              activeProblemDetail.sampleOutput
            "
            class="section"
          >
            <div class="section-label">Sample</div>
            <div class="sample-grid">
              <div v-if="activeProblemDetail.sampleInput">
                <div class="sample-label">Input</div>
                <pre class="code-block">{{
                  activeProblemDetail.sampleInput
                }}</pre>
              </div>
              <div v-if="activeProblemDetail.sampleOutput">
                <div class="sample-label">Output</div>
                <pre class="code-block">{{
                  activeProblemDetail.sampleOutput
                }}</pre>
              </div>
            </div>
          </div>

          <!-- Meta chips -->
          <div class="meta-chips">
            <span v-if="currentProblem?.maxScore" class="meta-chip"
              >{{ currentProblem.maxScore }} pts</span
            >
            <span v-if="currentProblem?.timeLimitMs" class="meta-chip"
              >{{ currentProblem.timeLimitMs }}ms</span
            >
            <span v-if="currentProblem?.memoryLimitKb" class="meta-chip">
              {{ Math.round(currentProblem.memoryLimitKb / 1024) }}MB
            </span>
          </div>
        </div>
      </template>

      <!-- MCQ section active -->
      <template v-else-if="editorStore.activeMcqSection">
        <div class="detail-placeholder">
          <span class="material-symbols-outlined text-[28px] text-violet-400/40"
            >quiz</span
          >
          <p class="text-[11px] text-slate-500">MCQ section open in editor</p>
        </div>
      </template>

      <!-- Problem selected but detail not loaded -->
      <template v-else-if="editorStore.activeProblemId && !activeProblemDetail">
        <div class="hint-panel">
          <span class="material-symbols-outlined hint-icon">lock</span>
          <div class="hint-title">Problem details locked</div>
          <code class="hint-endpoint"
            >GET /api/exams/{{ examStore.activeExam?.id ?? ':id' }}/problems/{{
              editorStore.activeProblemId
            }}</code
          >
          <div class="hint-text">
            Call this endpoint in the API Client tab to unlock the full problem
            description, constraints, and sample cases.
          </div>
        </div>
      </template>

      <!-- No problem selected -->
      <template v-else>
        <div class="detail-placeholder">
          <span class="material-symbols-outlined text-[28px] text-slate-400/40"
            >description</span
          >
          <p class="text-[11px] text-slate-500">
            Select a problem to view details
          </p>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  @apply flex flex-col h-full overflow-hidden
         bg-slate-50 dark:bg-[#0d1117]
         border-r border-slate-200 dark:border-white/[0.06];
}

.sidebar-header {
  @apply flex items-center justify-between px-3 py-2.5
         border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0;
}

.count-badge {
  @apply inline-flex items-center justify-center px-1.5 h-4 rounded
         bg-slate-200/60 dark:bg-white/[0.05]
         text-[9px] font-bold text-slate-500 tabular-nums;
}

.collapse-btn {
  @apply flex items-center justify-center w-5 h-5 rounded
         text-slate-400 dark:text-slate-600
         hover:text-slate-700 dark:hover:text-slate-300
         hover:bg-slate-100 dark:hover:bg-white/[0.06]
         transition-all cursor-pointer;
}

/* ── Problem items ── */
.problem-item {
  @apply relative flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
         border border-transparent cursor-pointer transition-all duration-100 text-left;
  animation: problem-slide-in 0.2s ease-out both;
}
.problem-active {
  @apply bg-primary/[0.07] border-primary/[0.10] text-primary;
}
.problem-idle {
  @apply text-slate-500 dark:text-slate-400
         hover:bg-slate-100 dark:hover:bg-white/[0.03]
         hover:text-slate-800 dark:hover:text-slate-200;
}
.problem-solved {
  @apply text-emerald-500/60 cursor-default;
}

.mcq-section-item.problem-solved {
  @apply text-violet-500/60;
}

.active-bar {
  @apply absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary transition-opacity;
}

@keyframes problem-slide-in {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ── Detail panel ── */
.detail-header {
  @apply flex items-center gap-2.5 flex-wrap px-4 pt-4 pb-2 flex-shrink-0;
}

.detail-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-body {
  @apply flex flex-col gap-3.5 px-4 pb-4;
}

.detail-placeholder {
  @apply flex flex-col items-center justify-center gap-2 py-12 text-center;
}

.difficulty-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 20px;
}

.diff-easy {
  background: rgb(var(--color-accent) / 0.15);
  color: var(--status-success);
}
.diff-medium {
  background: rgba(228, 165, 38, 0.15);
  color: #e4a526;
}
.diff-hard {
  background: rgba(228, 38, 70, 0.15);
  color: var(--status-error);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.text-block {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.sample-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sample-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.code-block {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  white-space: pre;
  overflow-x: auto;
  margin: 0;
}

.meta-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.meta-chip {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 7px;
}

/* Hint panel */
.hint-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  text-align: center;
}

.hint-icon {
  font-size: 28px;
  color: var(--text-muted);
}

.hint-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.hint-endpoint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--brand-teal);
  background: rgb(var(--color-accent) / 0.08);
  padding: 4px 10px;
  border-radius: var(--radius-md);
  word-break: break-all;
}

.hint-text {
  font-size: 12px;
  color: var(--text-muted);
  max-width: 360px;
  line-height: 1.5;
}

/* ── Custom scrollbar ── */
.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15);
}
:global(.dark) .sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
}
:global(.dark) .sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
