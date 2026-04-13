<script setup lang="ts">
import {
  provide,
  onMounted,
  onUnmounted,
  ref,
  computed,
  watch,
  nextTick,
} from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '../components/layout/AppHeader.vue';
import WorkspaceSidebar from '../components/layout/WorkspaceSidebar.vue';
import Sidebar from '../components/layout/Sidebar.vue';
import BottomPanel from '../components/layout/BottomPanel.vue';
import WelcomeBanner from '../components/shared/WelcomeBanner.vue';
import Toast from '../components/shared/Toast.vue';
import SuccessModal from '../components/shared/SuccessModal.vue';
import ApiDocs from '../components/tabs/ApiDocs.vue';
import ApiClient from '../components/tabs/ApiClient.vue';
import CodeEditor from '../components/tabs/CodeEditor.vue';
import McqSection from '../components/student/McqSection.vue';
import { useUiStore } from '../stores/ui';
import { useExamStore } from '../stores/exam';
import { useRunSubmitStore } from '../stores/runSubmit';
import { useEditorStore } from '../stores/editor';
import { useResizable } from '../composables/useResizable';
import { useAutosave } from '../composables/useAutosave';
import { useTimer } from '../composables/useTimer';
import { useCelebration } from '../composables/useCelebration';

const route = useRoute();
const uiStore = useUiStore();
const examStore = useExamStore();
const runSubmit = useRunSubmitStore();
const editorStore = useEditorStore();

const successModal = ref<{
  mode: 'submit' | 'run';
  problemTitle: string;
  score: number;
  passedTests: number;
  totalTests: number;
  language: string;
} | null>(null);

watch(
  () => runSubmit.submission,
  (s) => {
    if (
      s?.verdict === 'accepted' &&
      editorStore.activeProblem?.questionType !== 'mcq'
    ) {
      successModal.value = {
        mode: 'submit',
        problemTitle: editorStore.activeProblem?.title ?? '',
        score: s.score,
        passedTests: s.passedTests,
        totalTests: s.totalTests,
        language: editorStore.language.name,
      };
    }
  },
);

watch(
  () => runSubmit.runResult,
  (r) => {
    if (
      r &&
      !runSubmit.lastRunHadCustomInput &&
      r.results.length > 0 &&
      r.results.every((x) => x.passed)
    ) {
      successModal.value = {
        mode: 'run',
        problemTitle: editorStore.activeProblem?.title ?? '',
        score: 0,
        passedTests: r.results.length,
        totalTests: r.results.length,
        language: editorStore.language.name,
      };
    }
  },
);

const {
  start: startAutosave,
  stop: stopAutosave,
  forceSave,
  saveStatus,
} = useAutosave();
provide('saveStatus', saveStatus);
provide('forceSave', forceSave);

const {
  remaining,
  isWarning,
  isCritical,
  isExpired,
  start: startTimer,
} = useTimer();
provide('timerState', { remaining, isWarning, isCritical, isExpired });

const celebration = useCelebration();

const loading = ref(true);

onMounted(async () => {
  await examStore.fetchActiveExam();

  // Ensure selectedExam matches the route param
  const routeExamId = Number(route.params.id);
  if (routeExamId && examStore.selectedExam?.id !== routeExamId) {
    const match = examStore.activeExams.find((e) => e.id === routeExamId);
    if (match) examStore.selectExam(match);
  }

  await examStore.fetchMyProgress();
  loading.value = false;
  void startAutosave();
  void startTimer();

  // Auto-launch the guided tour once per exam
  const examId = examStore.activeExam?.id;
  const tourKey = `tourShown:${examId}`;
  if (examId && !localStorage.getItem(tourKey)) {
    await nextTick();
    const { startTour } = await import('../composables/useTour');
    void startTour();
    localStorage.setItem(tourKey, '1');
  }
});

watch(isExpired, (expired) => {
  if (expired) stopAutosave();
});

onUnmounted(() => {
  celebration.stop();
});

watch(
  () => examStore.myProgress?.allSolved,
  (allSolved) => {
    if (allSolved) celebration.start();
  },
);

const examState = computed(() => {
  if (loading.value) return 'loading';
  if (!examStore.activeExam) return 'no-exam';
  if (examStore.myProgress?.allSolved) return 'completed';
  if (isExpired.value) return 'ended';
  return 'active';
});

const { onMouseDown: onSidebarDrag } = useResizable('vertical', (delta) => {
  if (uiStore.sidebarCollapsed) return;
  const next = uiStore.sidebarWidth + delta;
  if (next < 40) {
    uiStore.setSidebarCollapsed(true);
  } else {
    uiStore.setSidebarWidth(
      Math.min(Math.max(next, 280), window.innerWidth * 0.6),
    );
  }
});

const { onMouseDown: onBottomDrag } = useResizable('horizontal', (delta) => {
  const next = uiStore.bottomPanelHeight - delta;
  if (next >= 40 && next <= window.innerHeight * 0.7)
    uiStore.setBottomPanelHeight(next);
});
</script>

<template>
  <div
    class="flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark"
  >
    <!-- Shared header -->
    <AppHeader />

    <!-- Loading state -->
    <div
      v-if="examState === 'loading'"
      class="flex flex-1 items-center justify-center state-screen-enter"
    >
      <span
        class="material-symbols-outlined text-4xl text-slate-400 animate-spin"
        >progress_activity</span
      >
    </div>

    <!-- No active exam -->
    <div
      v-else-if="examState === 'no-exam'"
      class="flex flex-1 items-center justify-center state-screen-enter"
    >
      <div class="text-center max-w-sm px-6">
        <span
          class="material-symbols-outlined text-5xl text-slate-400 mb-4 block"
          >event_busy</span
        >
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          No active exam right now
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Check back when an exam is scheduled. You'll be notified when it goes
          live.
        </p>
      </div>
    </div>

    <!-- All problems solved -->
    <div
      v-else-if="examState === 'completed'"
      class="flex flex-1 items-center justify-center state-screen-enter"
    >
      <div class="text-center max-w-sm px-6">
        <span
          class="material-symbols-outlined text-5xl text-emerald-400 mb-4 block trophy-bounce"
          >emoji_events</span
        >
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          You've completed the exam!
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {{ examStore.myProgress?.solvedProblems }} /
          {{ examStore.myProgress?.totalProblems }} problems solved
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Sit tight, results will be announced after the exam closes.
        </p>
      </div>
      <!-- Celebration toggle button -->
      <button
        class="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-slate-800 border border-white/[0.10] text-white text-sm font-semibold shadow-xl hover:bg-slate-700 transition-colors z-50"
        :title="`Current: ${celebration.mode.value} - click to change`"
        @click="celebration.toggleMode()"
      >
        <span v-if="celebration.mode.value === 'snow'">❄️ Snow</span>
        <span v-else-if="celebration.mode.value === 'fireworks'"
          >🎆 Fireworks</span
        >
        <span v-else-if="celebration.mode.value === 'realistic'"
          >🎊 Realistic</span
        >
        <span v-else-if="celebration.mode.value === 'stars'">⭐ Stars</span>
        <span v-else-if="celebration.mode.value === 'cannon'">🎯 Cannon</span>
        <span v-else-if="celebration.mode.value === 'continuous'"
          >🎉 Continuous</span
        >
        <span v-else-if="celebration.mode.value === 'emoji'">😄 Emoji</span>
      </button>
    </div>

    <!-- Exam ended (timer expired) -->
    <div
      v-else-if="examState === 'ended'"
      class="flex flex-1 items-center justify-center state-screen-enter"
    >
      <div class="text-center max-w-sm px-6">
        <span class="material-symbols-outlined text-5xl text-primary mb-4 block"
          >timer_off</span
        >
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          Exam has ended
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Time's up - no more submissions are accepted.
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Your submissions have been recorded. Results coming soon.
        </p>
      </div>
    </div>

    <!-- Active exam workspace -->
    <template v-else>
      <!-- Banner + body -->
      <WelcomeBanner />

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <!-- Left icon sidebar for tab navigation -->
        <WorkspaceSidebar v-if="!uiStore.editorExpanded" />

        <!-- Tab content area -->
        <div class="flex-1 min-w-0 overflow-hidden">
          <!-- API Docs -->
          <div
            v-show="uiStore.activeTab === 'api-docs'"
            class="h-full overflow-hidden"
          >
            <ApiDocs />
          </div>

          <!-- API Client -->
          <div
            v-show="uiStore.activeTab === 'api-client'"
            class="h-full overflow-hidden"
          >
            <ApiClient />
          </div>

          <!-- Code Editor -->
          <div
            v-show="uiStore.activeTab === 'code-editor'"
            class="h-full overflow-hidden"
          >
            <div class="flex h-full relative">
              <template v-if="!uiStore.editorExpanded">
                <div
                  class="flex-shrink-0 overflow-hidden"
                  :style="{
                    width: uiStore.sidebarCollapsed
                      ? '0px'
                      : uiStore.sidebarWidth + 'px',
                  }"
                >
                  <Sidebar />
                </div>

                <div
                  v-if="!uiStore.sidebarCollapsed"
                  class="w-3 flex-shrink-0 flex items-stretch justify-center cursor-col-resize group"
                  @mousedown="onSidebarDrag"
                >
                  <div
                    class="w-px bg-slate-200 dark:bg-white/[0.06] group-hover:bg-primary/40 transition-colors duration-150"
                  />
                </div>

                <button
                  v-if="uiStore.sidebarCollapsed"
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-9 z-10 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-l-0 rounded-r text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer text-xs flex items-center justify-center p-0 transition-colors"
                  @click="uiStore.setSidebarCollapsed(false)"
                >
                  &#8250;
                </button>
              </template>

              <div
                class="flex-1 flex flex-col min-w-0 overflow-hidden"
                :style="{
                  paddingLeft:
                    !uiStore.editorExpanded && uiStore.sidebarCollapsed
                      ? '18px'
                      : '0',
                }"
              >
                <div class="flex-1 min-h-0 overflow-hidden">
                  <McqSection
                    v-if="editorStore.activeMcqSection"
                    :exam-id="examStore.activeExam?.id ?? 0"
                  />
                  <CodeEditor v-else />
                </div>
                <template
                  v-if="
                    !uiStore.editorExpanded && !editorStore.activeMcqSection
                  "
                >
                  <div
                    class="h-px flex-shrink-0 bg-slate-200 dark:bg-white/[0.06] cursor-row-resize transition-colors hover:bg-primary/40"
                    @mousedown="onBottomDrag"
                  />
                  <div
                    class="flex-shrink-0 overflow-hidden"
                    :style="{ height: uiStore.bottomPanelHeight + 'px' }"
                  >
                    <BottomPanel />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <SuccessModal
      v-if="successModal"
      v-bind="successModal"
      @close="successModal = null"
      @go-submit="
        successModal = null;
        runSubmit.submit();
      "
    />

    <Toast />
  </div>
</template>

<style scoped>
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.state-screen-enter {
  animation: fade-up 0.25s ease-out both;
}

@keyframes trophy-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-4px);
  }
}
.trophy-bounce {
  animation: trophy-bounce 0.7s ease-out 0.15s both;
}
</style>
