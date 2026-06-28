<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useRunSubmitStore } from '../../stores/runSubmit';
import { useAuthStore } from '../../stores/auth';

const uiStore = useUiStore();
const runSubmit = useRunSubmitStore();
const authStore = useAuthStore();

const customInput = ref('');
const runId = ref(0);
watch(
  () => runSubmit.runResult,
  () => {
    runId.value++;
  },
);
const expandedErrors = ref<Set<number>>(new Set());

function toggleError(i: number) {
  if (expandedErrors.value.has(i)) expandedErrors.value.delete(i);
  else expandedErrors.value.add(i);
}

async function runWithInput() {
  await runSubmit.run(customInput.value || undefined);
  uiStore.setBottomTab('run-results');
}

function passCount(results: { passed: boolean }[]) {
  return results.filter((r) => r.passed).length;
}
function passPercent(results: { passed: boolean }[]) {
  return results.length ? (passCount(results) / results.length) * 100 : 0;
}

function verdictClass(verdict: string) {
  if (verdict === 'accepted') return 'verdict-accepted';
  if (verdict === 'partial') return 'verdict-partial';
  return 'verdict-failed';
}
function verdictIcon(verdict: string) {
  if (verdict === 'accepted') return 'check_circle';
  if (verdict === 'partial') return 'rule';
  return 'cancel';
}
</script>

<template>
  <div class="flex flex-col bg-white dark:bg-[#0d1117] h-full overflow-hidden">
    <!-- ── Tab strip ────────────────────────────────────────────────── -->
    <div
      class="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0"
    >
      <button
        v-for="tab in [
          { id: 'run-results', label: 'Run Results' },
          { id: 'custom-input', label: 'Custom Input' },
          { id: 'test-results', label: 'Submit Results' },
        ]"
        :key="tab.id"
        class="bottom-tab"
        :class="
          uiStore.bottomTab === tab.id ? 'bottom-tab-active' : 'bottom-tab-idle'
        "
        @click="uiStore.setBottomTab(tab.id as any)"
      >
        {{ tab.label }}
        <!-- Active indicator -->
        <span v-if="uiStore.bottomTab === tab.id" class="bottom-tab-bar" />
      </button>
    </div>

    <!-- ── Body ─────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto">
      <!-- ═══ Run Results ════════════════════════════════════════════ -->
      <div v-if="uiStore.bottomTab === 'run-results'" class="p-3">
        <!-- Empty state -->
        <div v-if="!runSubmit.runResult" class="empty-state">
          <span class="material-symbols-outlined text-[28px] opacity-20"
            >play_circle</span
          >
          <span class="text-xs text-slate-500 dark:text-slate-600"
            >Click Run or press Ctrl+Enter to test</span
          >
        </div>

        <template v-else>
          <!-- Pass rate summary -->
          <div v-if="runSubmit.runResult.results.length > 0" class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <span
                class="text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                >Sample Cases</span
              >
              <span
                class="text-[11px] font-mono"
                :class="
                  passCount(runSubmit.runResult.results) ===
                  runSubmit.runResult.results.length
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                "
              >
                {{ passCount(runSubmit.runResult.results) }}/{{
                  runSubmit.runResult.results.length
                }}
                passed
              </span>
            </div>
            <!-- Progress bar -->
            <div
              class="h-1 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden"
            >
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="
                  passPercent(runSubmit.runResult.results) === 100
                    ? 'bg-emerald-500'
                    : 'bg-yellow-500'
                "
                :style="{
                  width: passPercent(runSubmit.runResult.results) + '%',
                }"
              />
            </div>
          </div>

          <!-- Case rows with inline expansion -->
          <div class="flex flex-col gap-1">
            <template
              v-for="(r, index) in runSubmit.runResult.results"
              :key="`case-${runId}-${r.index}`"
            >
              <!-- Case row -->
              <div
                class="case-row case-row-in"
                :class="r.passed ? 'case-pass' : 'case-fail'"
                :style="{ animationDelay: `${index * 50}ms` }"
              >
                <div
                  class="w-0.5 self-stretch rounded-full flex-shrink-0"
                  :class="r.passed ? 'bg-emerald-500' : 'bg-red-500'"
                />
                <span
                  class="material-symbols-outlined text-[14px] flex-shrink-0 dot-pop"
                  :class="r.passed ? 'text-emerald-400' : 'text-red-400'"
                  :style="{ animationDelay: `${index * 25}ms` }"
                >
                  {{ r.passed ? 'check_circle' : 'cancel' }}
                </span>
                <span
                  class="font-mono text-[11px] text-slate-400 flex-shrink-0 min-w-[48px]"
                  >Case {{ r.index + 1 }}</span
                >
                <span
                  class="text-[11px] flex-1 truncate"
                  :class="r.passed ? 'text-emerald-400' : 'text-red-400'"
                  >{{ r.status }}</span
                >
                <span v-if="r.time" class="chip">{{ r.time }}s</span>
                <span v-if="r.memory" class="chip">{{ r.memory }}KB</span>
                <button
                  v-if="!r.passed || r.stderr || r.compileOutput"
                  class="flex-shrink-0 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  @click="toggleError(r.index)"
                >
                  <span class="material-symbols-outlined text-[13px]">
                    {{
                      expandedErrors.has(r.index)
                        ? 'expand_less'
                        : 'expand_more'
                    }}
                  </span>
                </button>
              </div>

              <!-- Expanded detail (inline below the case) -->
              <Transition name="slide">
                <div
                  v-if="
                    expandedErrors.has(r.index) && (r.compileOutput || r.stderr)
                  "
                  class="error-block"
                >
                  <pre
                    v-if="r.compileOutput"
                    class="error-pre text-amber-400"
                    >{{ r.compileOutput }}</pre
                  >
                  <pre v-if="r.stderr" class="error-pre text-red-400">{{
                    r.stderr
                  }}</pre>
                </div>
              </Transition>
              <div
                v-if="
                  expandedErrors.has(r.index) &&
                  !r.passed &&
                  (r.expectedOutput || r.stdout)
                "
                class="ml-4 flex flex-col gap-2 mb-1"
              >
                <div v-if="r.input" class="flex flex-col gap-0.5">
                  <p
                    class="text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                  >
                    Input
                  </p>
                  <pre class="output-pre">{{ r.input }}</pre>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex flex-col gap-0.5">
                    <p
                      class="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/70"
                    >
                      Expected Output
                    </p>
                    <pre class="output-pre text-emerald-400">{{
                      r.expectedOutput ?? '-'
                    }}</pre>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <p
                      class="text-[10px] font-semibold uppercase tracking-widest text-red-500/70"
                    >
                      Your Output
                    </p>
                    <pre class="output-pre text-red-400">{{
                      r.stdout ?? '(no output)'
                    }}</pre>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Custom result (when run included custom input) -->
          <template v-if="runSubmit.runResult.customResult">
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-4 mb-2"
            >
              Custom Input Result
            </p>
            <div
              class="case-row"
              :class="
                ['accepted', 'Accepted'].includes(
                  runSubmit.runResult.customResult.status,
                )
                  ? 'case-pass'
                  : 'case-fail'
              "
            >
              <div
                class="w-0.5 self-stretch rounded-full flex-shrink-0"
                :class="
                  ['accepted', 'Accepted'].includes(
                    runSubmit.runResult.customResult.status,
                  )
                    ? 'bg-emerald-500'
                    : 'bg-slate-600'
                "
              />
              <span
                class="text-[11px] flex-1"
                :class="
                  ['accepted', 'Accepted'].includes(
                    runSubmit.runResult.customResult.status,
                  )
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                "
              >
                {{ runSubmit.runResult.customResult.status }}
              </span>
              <span v-if="runSubmit.runResult.customResult.time" class="chip"
                >{{ runSubmit.runResult.customResult.time }}s</span
              >
              <span v-if="runSubmit.runResult.customResult.memory" class="chip"
                >{{ runSubmit.runResult.customResult.memory }}KB</span
              >
            </div>
            <p
              v-if="runSubmit.runResult.customResult.stdout"
              class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-2 mb-1"
            >
              Your Output
            </p>
            <pre
              v-if="runSubmit.runResult.customResult.stdout"
              class="output-pre mt-2"
              >{{ runSubmit.runResult.customResult.stdout }}</pre
            >
            <template
              v-if="runSubmit.runResult.customResult.expectedOutput != null"
            >
              <p
                class="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/70 mt-2 mb-1"
              >
                Expected Output
              </p>
              <pre class="output-pre text-emerald-400">{{
                runSubmit.runResult.customResult.expectedOutput
              }}</pre>
            </template>
            <p
              v-else-if="runSubmit.runResult.customResult.expectedOutputError"
              class="text-[11px] text-amber-500/70 mt-2 italic"
            >
              {{ runSubmit.runResult.customResult.expectedOutputError }}
            </p>
            <pre
              v-if="runSubmit.runResult.customResult.compileOutput"
              class="error-pre text-amber-400 mt-1"
              >{{ runSubmit.runResult.customResult.compileOutput }}</pre
            >
            <pre
              v-if="runSubmit.runResult.customResult.stderr"
              class="error-pre text-red-400 mt-1"
              >{{ runSubmit.runResult.customResult.stderr }}</pre
            >
          </template>

          <div
            v-else-if="runSubmit.runResult.results.length === 0"
            class="text-xs text-slate-500 dark:text-slate-600 py-2"
          >
            No sample test cases available.
          </div>
        </template>
      </div>

      <!-- ═══ Custom Input ═══════════════════════════════════════════ -->
      <div
        v-if="uiStore.bottomTab === 'custom-input'"
        class="p-3 flex flex-col gap-2.5 h-full"
      >
        <p class="text-[11px] text-slate-500">
          Enter custom stdin and run your code against it.
        </p>
        <textarea
          v-model="customInput"
          class="flex-1 min-h-[72px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.07] rounded-lg px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 resize-none outline-none focus:border-primary/30 placeholder-slate-400 dark:placeholder-slate-700 transition-colors"
          placeholder="3&#10;1 2 3"
          spellcheck="false"
        />
        <button
          class="self-start flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
          :class="
            runSubmit.running
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-wait'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20'
          "
          :disabled="runSubmit.running || !authStore.isAuthenticated"
          @click="runWithInput"
        >
          <span class="material-symbols-outlined text-[14px]">play_arrow</span>
          {{ runSubmit.running ? 'Running…' : 'Run with Input' }}
        </button>
      </div>

      <!-- ═══ Submit Results ════════════════════════════════════════ -->
      <div v-if="uiStore.bottomTab === 'test-results'" class="p-3">
        <!-- Empty state -->
        <div v-if="!runSubmit.submission" class="empty-state">
          <span class="material-symbols-outlined text-[28px] opacity-20"
            >upload</span
          >
          <span class="text-xs text-slate-500 dark:text-slate-600"
            >Submit code to see full test results</span
          >
        </div>

        <template v-else>
          <!-- Verdict banner -->
          <div
            :key="`verdict-${runId}`"
            class="verdict-banner verdict-pop mb-4"
            :class="verdictClass(runSubmit.submission.verdict)"
          >
            <span class="material-symbols-outlined text-[20px]">{{
              verdictIcon(runSubmit.submission.verdict)
            }}</span>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-bold uppercase tracking-wide">{{
                runSubmit.submission.verdict.replace('_', ' ')
              }}</span>
              <span class="text-[10px] opacity-70">
                {{ runSubmit.submission.passedTests }}/{{
                  runSubmit.submission.totalTests
                }}
                test cases passed
              </span>
            </div>
            <span
              v-if="runSubmit.submission.score"
              class="ml-auto font-mono text-sm font-bold"
            >
              +{{ runSubmit.submission.score }} pts
            </span>
          </div>

          <!-- Accepted message -->
          <p
            v-if="runSubmit.submission.verdict === 'accepted'"
            class="text-xs text-emerald-500/70 mb-4 flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[14px]"
              >celebration</span
            >
            All test cases passed. Well done!
          </p>

          <!-- Case dot grid -->
          <div
            v-if="(runSubmit.submission.results ?? []).length > 0"
            class="flex flex-wrap gap-1.5 mb-4"
          >
            <button
              v-for="r in runSubmit.submission.results ?? []"
              :key="r.index"
              class="case-dot cursor-pointer hover:scale-110 transition-transform"
              :class="
                r.passed
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              "
              :title="`Case ${r.index + 1}: ${r.status}`"
              @click="!r.passed && toggleError(1000 + r.index)"
            >
              {{ r.index + 1 }}
            </button>
          </div>

          <!-- Detailed rows for failed cases (inline expansion) -->
          <div
            v-if="(runSubmit.submission.results ?? []).some((r) => !r.passed)"
            class="flex flex-col gap-1"
          >
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1"
            >
              Failed Cases
            </p>
            <template
              v-for="r in (runSubmit.submission.results ?? []).filter(
                (r) => !r.passed,
              )"
              :key="'sf-' + r.index"
            >
              <div class="case-row case-fail">
                <div
                  class="w-0.5 self-stretch rounded-full flex-shrink-0 bg-red-500"
                />
                <span
                  class="material-symbols-outlined text-[14px] text-red-400 flex-shrink-0"
                  >cancel</span
                >
                <span
                  class="font-mono text-[11px] text-slate-400 flex-shrink-0 min-w-[48px]"
                  >Case {{ r.index + 1 }}</span
                >
                <span class="text-[11px] text-red-400 flex-1 truncate">{{
                  r.status
                }}</span>
                <span v-if="r.time" class="chip">{{ r.time }}s</span>
                <span v-if="r.memory" class="chip">{{ r.memory }}KB</span>
                <button
                  v-if="r.stderr || r.compileOutput"
                  class="flex-shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  @click="toggleError(1000 + r.index)"
                >
                  <span class="material-symbols-outlined text-[13px]">
                    {{
                      expandedErrors.has(1000 + r.index)
                        ? 'expand_less'
                        : 'expand_more'
                    }}
                  </span>
                </button>
              </div>

              <!-- Expanded error detail (inline below this case) -->
              <Transition name="slide">
                <div
                  v-if="
                    expandedErrors.has(1000 + r.index) &&
                    (r.compileOutput || r.stderr)
                  "
                  class="error-block"
                >
                  <pre
                    v-if="r.compileOutput"
                    class="error-pre text-amber-400"
                    >{{ r.compileOutput }}</pre
                  >
                  <pre v-if="r.stderr" class="error-pre text-red-400">{{
                    r.stderr
                  }}</pre>
                </div>
              </Transition>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Tabs ── */
.bottom-tab {
  @apply relative flex items-center px-3 py-2 text-[11px] font-medium cursor-pointer transition-colors select-none;
  @apply pb-2.5;
}
.bottom-tab-active {
  @apply text-primary;
}
.bottom-tab-idle {
  @apply text-slate-500 hover:text-slate-700 dark:hover:text-slate-300;
}
.bottom-tab-bar {
  @apply absolute bottom-0 left-3 right-3 h-[2px] bg-primary rounded-t-full;
}

/* ── Empty states ── */
.empty-state {
  @apply flex flex-col items-center justify-center gap-2 py-10 text-center;
}

/* ── Case rows ── */
.case-row {
  @apply flex items-center gap-2 px-2.5 py-1.5 rounded-lg;
}
.case-pass {
  @apply bg-emerald-500/[0.05];
}
.case-fail {
  @apply bg-red-500/[0.05];
}

/* ── Chips ── */
.chip {
  @apply flex-shrink-0 text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/[0.04] px-1.5 py-px rounded;
}

/* ── Error / output blocks ── */
.error-block {
  @apply ml-4 flex flex-col gap-1;
}
.error-pre {
  @apply bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-lg p-2
         text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap;
}
.output-pre {
  @apply bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-lg p-2
         text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap;
}

/* ── Verdict banner ── */
.verdict-banner {
  @apply flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold;
}
.verdict-accepted {
  @apply bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-400;
}
.verdict-partial {
  @apply bg-yellow-500/[0.08]  border-yellow-500/25  text-yellow-400;
}
.verdict-failed {
  @apply bg-red-500/[0.08]     border-red-500/25     text-red-400;
}

/* ── Case dot grid ── */
.case-dot {
  @apply w-7 h-7 rounded-md border flex items-center justify-center
         text-[10px] font-bold font-mono cursor-default;
}

/* ── Slide transition for error panels ── */
.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Run result animations ── */
@keyframes verdict-pop {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.verdict-pop {
  animation: verdict-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes case-row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.case-row-in {
  animation: case-row-in 0.18s ease-out both;
}

@keyframes dot-pop {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.dot-pop {
  animation: dot-pop 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
</style>
