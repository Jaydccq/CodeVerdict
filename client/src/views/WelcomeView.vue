<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import AppHeader from '../components/layout/AppHeader.vue';
import { useExamStore } from '../stores/exam';
import type { Exam } from '../types';
import { brand } from '../config/brand';

const router = useRouter();
const examStore = useExamStore();
const mobileMenuOpen = ref(false);
const entering = ref(false);
const loading = ref(true);
const pickedExam = ref<Exam | null>(null);

// The exam being viewed on the countdown/enter screen
const viewingExam = computed(() => pickedExam.value ?? examStore.activeExam);

// Show the exam picker when there are multiple exams and none picked yet
const showExamPicker = computed(
  () => !loading.value && examStore.activeExams.length > 1 && !pickedExam.value,
);

function pickExam(exam: Exam) {
  pickedExam.value = exam;
}

function backToPicker() {
  pickedExam.value = null;
  stopPreStart();
}

// --- Pre-start countdown ---
const preStartRemaining = ref('--:--:--');
let preStartInterval: ReturnType<typeof setInterval> | null = null;

const isUpcoming = computed(() => {
  const exam = viewingExam.value;
  if (!exam) return false;
  return dayjs(exam.startTime).valueOf() > Date.now() + examStore.serverDrift;
});

function tickPreStart() {
  const startTime = viewingExam.value?.startTime;
  if (!startTime) return;
  const diff =
    dayjs(startTime).valueOf() - (Date.now() + examStore.serverDrift);
  if (diff <= 0) {
    preStartRemaining.value = '00:00:00';
    stopPreStart();
    void examStore.fetchActiveExam();
    return;
  }
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  preStartRemaining.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function stopPreStart() {
  if (preStartInterval) {
    clearInterval(preStartInterval);
    preStartInterval = null;
  }
}

watch(isUpcoming, (upcoming) => {
  if (upcoming && !preStartInterval) {
    tickPreStart();
    preStartInterval = setInterval(tickPreStart, 1000);
  } else if (!upcoming) {
    stopPreStart();
  }
});

onMounted(async () => {
  await examStore.fetchActiveExam();
  loading.value = false;
  if (isUpcoming.value) {
    tickPreStart();
    preStartInterval = setInterval(tickPreStart, 1000);
  }
});

onUnmounted(stopPreStart);

const examDate = computed(() => {
  const exam = viewingExam.value;
  if (!exam) return null;
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  const dateStr = start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const startTime = start
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  const endTime = end
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  return `${dateStr} · ${startTime} – ${endTime}`;
});

const examDuration = computed(() => {
  const exam = viewingExam.value;
  if (!exam) return null;
  const h = Math.floor(exam.durationMinutes / 60);
  const m = exam.durationMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`;
  return `${m} minutes`;
});

async function enterContest() {
  const exam = viewingExam.value;
  if (!exam) return;
  examStore.selectExam(exam);
  entering.value = true;
  try {
    await router.push({
      name: 'workspace',
      params: { id: exam.id },
    });
  } finally {
    entering.value = false;
  }
}

function scrollTo(id: string) {
  mobileMenuOpen.value = false;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

const steps = [
  {
    icon: 'person_add',
    title: 'Register & Login',
    desc: 'Create your account, then authenticate to receive an access token for all subsequent requests.',
  },
  {
    icon: 'how_to_reg',
    title: 'Enroll in the Exam',
    desc: 'Enrollment is required before the exam window opens - without it, problems and submissions are inaccessible.',
  },
  {
    icon: 'menu_book',
    title: 'Explore & Fetch Problems',
    desc: 'Study the API docs carefully, then retrieve the problem set once the exam window is active.',
  },
  {
    icon: 'code',
    title: 'Write Code',
    desc: 'Solve each problem in the built-in code editor using any of the supported languages.',
  },
  {
    icon: 'publish',
    title: 'Test & Submit',
    desc: 'Run against sample cases, then submit for full grading against all hidden test cases.',
  },
];

const details = [
  {
    title: 'First 15 Minutes - Read & Prepare',
    desc: 'Use the opening window to go through the rules, API docs, and understand the contest flow before coding.',
  },
  {
    title: 'Start When Ready',
    desc: 'Once you understand the flow, begin solving problems at your own pace within the allotted time.',
  },
  {
    title: 'Time-based Scoring',
    desc: 'Scoring factors in correctness and speed. Faster accepted solutions rank higher on the leaderboard.',
  },
  {
    title: 'Top Performers Shortlisted',
    desc: 'Top performers will be shortlisted for the next round of technical interviews.',
  },
];

const rules = [
  {
    num: '01',
    title: 'Individual Contest',
    desc: 'Solo competition only. No collaboration, discussion, or external help is allowed.',
  },
  {
    num: '02',
    title: 'No External Tabs or AI Tools',
    desc: 'Do not use other browser tabs, AI assistants, or any external tools during the contest.',
  },
  {
    num: '03',
    title: 'Plagiarism Check',
    desc: 'All submissions are checked post-event. Any matches result in immediate disqualification.',
  },
  {
    num: '04',
    title: 'Immediate Removal',
    desc: 'Screen sharing, AI usage, or browsing other tabs will result in removal from the contest.',
  },
];
</script>

<template>
  <div
    class="relative flex w-full flex-col overflow-y-auto overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300"
    style="height: 100%"
  >
    <!-- ── Ambient Background Layer ───────────────────────────────────── -->
    <div
      class="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 dot-grid opacity-[0.12] dark:opacity-[0.07]"
      ></div>
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <AppHeader>
      <template #nav>
        <button
          class="text-sm font-medium hover:text-primary transition-colors"
          @click="scrollTo('how-it-works')"
        >
          How It Works
        </button>
        <button
          class="text-sm font-medium hover:text-primary transition-colors"
          @click="scrollTo('details')"
        >
          Details
        </button>
        <button
          class="text-sm font-medium hover:text-primary transition-colors"
          @click="scrollTo('rules')"
        >
          Rules
        </button>
      </template>
      <template #mobile-toggle>
        <button
          class="md:hidden text-slate-600 dark:text-slate-300"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span class="material-symbols-outlined">{{
            mobileMenuOpen ? 'close' : 'menu'
          }}</span>
        </button>
      </template>
    </AppHeader>

    <!-- ── Mobile Menu ─────────────────────────────────────────────────── -->
    <Transition name="slide">
      <div
        v-if="mobileMenuOpen"
        class="md:hidden fixed inset-x-0 top-[57px] z-40 bg-white/95 dark:bg-accent-navy/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xl"
      >
        <button
          class="text-sm font-medium py-2 hover:text-primary"
          @click="scrollTo('how-it-works')"
        >
          How It Works
        </button>
        <button
          class="text-sm font-medium py-2 hover:text-primary"
          @click="scrollTo('details')"
        >
          Details
        </button>
        <button
          class="text-sm font-medium py-2 hover:text-primary"
          @click="scrollTo('rules')"
        >
          Rules
        </button>
      </div>
    </Transition>

    <main class="relative z-10 flex-1 overflow-y-auto">
      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- HERO                                                          -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <section class="max-w-[1200px] mx-auto px-6 py-16 md:py-28">
        <div class="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <!-- Left: Text -->
          <div class="flex flex-col gap-6 flex-1 min-w-0">
            <!-- Loading skeleton -->
            <template v-if="loading">
              <div class="flex flex-col gap-4">
                <div
                  class="h-5 w-36 bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 6px"
                />
                <div
                  class="h-16 w-4/5 bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 8px"
                />
                <div
                  class="h-16 w-3/5 bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 8px"
                />
                <div
                  class="h-5 w-full bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 6px"
                />
                <div
                  class="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 6px"
                />
                <div
                  class="h-14 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style="border-radius: 10px"
                />
              </div>
            </template>

            <!-- Exam picker: multiple active exams -->
            <template v-else-if="showExamPicker">
              <div class="flex flex-col gap-5">
                <h1
                  class="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight"
                >
                  Choose Your<br />
                  <span class="text-primary">Contest</span>
                </h1>
                <p class="text-lg text-slate-500 max-w-lg leading-relaxed">
                  Multiple contests are available. Select one to view details
                  and enter.
                </p>
              </div>

              <div
                class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl max-h-[60vh] overflow-y-auto pr-1"
              >
                <button
                  v-for="exam in examStore.activeExams"
                  :key="exam.id"
                  class="flex flex-col gap-3 p-5 text-left bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer group"
                  style="border-radius: 12px"
                  @click="pickExam(exam)"
                >
                  <div class="flex items-center justify-between w-full">
                    <div
                      v-if="
                        dayjs(exam.startTime).valueOf() >
                        Date.now() + examStore.serverDrift
                      "
                      class="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold uppercase tracking-widest text-amber-500"
                      style="border-radius: 4px"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                      ></span>
                      Upcoming
                    </div>
                    <div
                      v-else
                      class="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold uppercase tracking-widest text-emerald-500"
                      style="border-radius: 4px"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                      ></span>
                      Live
                    </div>
                    <span
                      class="material-symbols-outlined text-[18px] text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors"
                      >arrow_forward</span
                    >
                  </div>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                    {{ exam.title }}
                  </h3>
                  <div
                    class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"
                  >
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]"
                        >schedule</span
                      >
                      {{ exam.durationMinutes }}min
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]"
                        >code</span
                      >
                      {{ exam.allowedLanguages?.length ?? 0 }} languages
                    </span>
                  </div>
                </button>
              </div>
            </template>

            <!-- No active exam -->
            <template v-else-if="!viewingExam">
              <div class="flex flex-col gap-5">
                <h1
                  class="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight"
                >
                  No Contest<br />
                  <span class="text-slate-300 dark:text-slate-700"
                    >Scheduled</span
                  >
                </h1>
                <p class="text-lg text-slate-500 max-w-lg leading-relaxed">
                  There is no active contest at the moment. Check back later or
                  contact your administrator.
                </p>
              </div>
            </template>

            <!-- Active exam / Selected exam -->
            <template v-else>
              <!-- Back to picker -->
              <button
                v-if="examStore.activeExams.length > 1 && pickedExam"
                class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer -mb-2"
                @click="backToPicker"
              >
                <span class="material-symbols-outlined text-[16px]"
                  >arrow_back</span
                >
                All Contests
              </button>
              <!-- Badge: upcoming vs live -->
              <div
                v-if="isUpcoming"
                class="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold uppercase tracking-widest w-fit"
                style="border-radius: 6px"
              >
                <span class="material-symbols-outlined text-[14px]"
                  >schedule</span
                >
                Starting Soon
              </div>
              <div
                v-else
                class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-widest w-fit"
                style="border-radius: 6px"
              >
                <span class="relative flex h-2 w-2">
                  <span
                    class="animate-ping absolute inset-0 rounded-full bg-primary opacity-75"
                  ></span>
                  <span class="relative rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Live Contest
              </div>

              <!-- Title -->
              <div class="flex flex-col gap-3">
                <h1
                  class="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight text-slate-900 dark:text-white"
                >
                  {{ viewingExam.title }}
                </h1>
                <p
                  class="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed"
                >
                  Test your API knowledge in a unique coding contest. Read docs,
                  call endpoints, fetch problems, and solve them - all through
                  APIs.
                </p>
              </div>

              <!-- Pre-start countdown -->
              <div v-if="isUpcoming" class="flex flex-col gap-2">
                <p
                  class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                >
                  Contest starts in
                </p>
                <div class="hero-countdown">
                  {{ preStartRemaining }}
                </div>
              </div>

              <!-- CTA -->
              <div class="flex flex-wrap items-center gap-4">
                <button
                  class="inline-flex items-center gap-3 h-14 px-8 bg-primary text-white text-base font-bold hover:bg-primary/90 shadow-[0_0_0_4px_rgb(var(--color-primary)/0.12)] hover:shadow-[0_0_32px_rgb(var(--color-primary)/0.50),_0_0_0_4px_rgb(var(--color-primary)/0.2)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-primary cursor-pointer"
                  style="border-radius: 10px"
                  :disabled="entering || isUpcoming"
                  @click="enterContest"
                >
                  <span class="material-symbols-outlined text-[20px]"
                    >rocket_launch</span
                  >
                  {{
                    entering
                      ? 'Entering…'
                      : isUpcoming
                        ? 'Contest Not Started'
                        : 'Enter Contest'
                  }}
                </button>
              </div>

              <!-- Stats chips -->
              <div class="flex flex-wrap items-center gap-2.5">
                <div
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300"
                  style="border-radius: 6px"
                >
                  <span
                    class="material-symbols-outlined text-[14px] text-primary"
                    >calendar_today</span
                  >
                  {{ examDate }}
                </div>
                <div
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300"
                  style="border-radius: 6px"
                >
                  <span
                    class="material-symbols-outlined text-[14px] text-primary"
                    >schedule</span
                  >
                  {{ examDuration }}
                </div>
                <div
                  v-if="!isUpcoming"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-500"
                  style="border-radius: 6px"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                  ></span>
                  Live
                </div>
                <div
                  v-else
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-500"
                  style="border-radius: 6px"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                  ></span>
                  Upcoming
                </div>
              </div>
            </template>
          </div>

          <!-- Right: Terminal card -->
          <div class="flex-shrink-0 w-full lg:w-[480px]">
            <div class="terminal-float relative" style="border-radius: 14px">
              <!-- Glow ring -->
              <div
                class="absolute -inset-px pointer-events-none opacity-60"
                style="
                  border-radius: 14px;
                  background: linear-gradient(
                    135deg,
                    rgb(var(--color-primary) / 0.4),
                    rgba(99, 102, 241, 0.2),
                    transparent
                  );
                  filter: blur(2px);
                "
                aria-hidden="true"
              ></div>

              <!-- Terminal window -->
              <div
                class="relative overflow-hidden bg-slate-950 border border-slate-700/50 shadow-2xl"
                style="border-radius: 14px"
              >
                <!-- Chrome bar -->
                <div
                  class="flex items-center gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-700/40"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-[#ff5f57]"></span>
                    <span class="w-3 h-3 rounded-full bg-[#febc2e]"></span>
                    <span class="w-3 h-3 rounded-full bg-[#28c840]"></span>
                  </div>
                  <div
                    class="flex-1 h-5 bg-slate-800 flex items-center px-2.5"
                    style="border-radius: 4px"
                  >
                    <span class="text-[10px] text-slate-500 font-mono truncate"
                      >POST /api/auth/register</span
                    >
                  </div>
                </div>

                <!-- Code body -->
                <div
                  class="p-6 font-mono text-[13px] leading-relaxed select-none"
                >
                  <!-- Method badge + path -->
                  <div class="flex items-center gap-2 mb-4">
                    <span
                      class="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary"
                      style="border-radius: 3px"
                      >POST</span
                    >
                    <span class="text-slate-300">/api/auth/register</span>
                  </div>

                  <!-- Request body -->
                  <div class="text-slate-500 mb-0.5">{</div>
                  <div class="pl-5 mb-0.5">
                    <span class="text-emerald-400">"rollNumber"</span>
                    <span class="text-slate-500">: </span>
                    <span class="text-amber-300">"20CS101"</span>
                    <span class="text-slate-500">,</span>
                  </div>
                  <div class="pl-5 mb-0.5">
                    <span class="text-emerald-400">"password"</span>
                    <span class="text-slate-500">: </span>
                    <span class="text-amber-300">"••••••••"</span>
                    <span class="text-slate-500">,</span>
                  </div>
                  <div class="pl-5">
                    <span class="text-emerald-400">"qaRoleOptIn"</span>
                    <span class="text-slate-500">: </span>
                    <span class="text-purple-400">true</span>
                  </div>
                  <div class="text-slate-500 mb-5">}</div>

                  <!-- Response -->
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-slate-600 text-[11px]">Response</span>
                    <span
                      class="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400"
                      style="border-radius: 3px"
                      >201 Created</span
                    >
                  </div>
                  <div class="text-slate-500 mb-0.5">{</div>
                  <div class="pl-5 mb-0.5">
                    <span class="text-emerald-400">"accessToken"</span>
                    <span class="text-slate-500">: </span>
                    <span class="text-sky-300">"eyJhbGciOiJIUzI1..."</span>
                  </div>
                  <div class="text-slate-500 mb-5">}</div>

                  <!-- Prompt line -->
                  <div class="flex items-center gap-2">
                    <span class="text-primary font-bold">▸</span>
                    <span
                      class="cursor-blink w-[9px] h-[16px] bg-primary/80 inline-block"
                    ></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- HOW IT WORKS                                                  -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <section
        id="how-it-works"
        class="py-20 md:py-24 bg-slate-50/70 dark:bg-accent-navy/20 backdrop-blur-sm"
      >
        <div class="max-w-[1200px] mx-auto px-6">
          <!-- Heading -->
          <div class="mb-14 text-center">
            <p
              class="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-3"
            >
              Process
            </p>
            <h2
              class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3"
            >
              How It Works
            </h2>
            <div
              class="h-1 w-12 bg-primary mx-auto"
              style="border-radius: 2px"
            ></div>
          </div>

          <!-- Steps grid with connecting line -->
          <div class="relative">
            <!-- Connecting line - desktop only -->
            <div
              class="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-px"
              style="
                background: linear-gradient(
                  to right,
                  transparent,
                  rgba(148, 163, 184, 0.3),
                  rgba(148, 163, 184, 0.3),
                  transparent
                );
              "
              aria-hidden="true"
            ></div>

            <div
              class="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5"
            >
              <div
                v-for="(step, i) in steps"
                :key="i"
                class="group flex flex-col gap-4 bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/30 p-6 pt-0 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 dark:-translate-y-0 hover:-translate-y-0.5"
                style="border-radius: 10px"
              >
                <!-- Step number row -->
                <div
                  class="flex items-center justify-between -mx-6 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span
                    class="text-5xl font-black leading-none select-none"
                    style="
                      background: linear-gradient(
                        135deg,
                        rgb(var(--color-primary) / 0.85),
                        rgb(var(--color-primary) / 0.25)
                      );
                      -webkit-background-clip: text;
                      background-clip: text;
                      -webkit-text-fill-color: transparent;
                    "
                    >{{ String(i + 1).padStart(2, '0') }}</span
                  >
                  <div
                    class="w-10 h-10 flex items-center justify-center bg-primary/8 dark:bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors"
                    style="border-radius: 8px"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{
                      step.icon
                    }}</span>
                  </div>
                </div>
                <h3
                  class="text-[15px] font-bold text-slate-900 dark:text-white"
                >
                  {{ step.title }}
                </h3>
                <p
                  class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                >
                  {{ step.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- CONTEST DETAILS                                               -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <section id="details" class="py-20 md:py-24 max-w-[1200px] mx-auto px-6">
        <div class="flex flex-col lg:flex-row gap-14 lg:gap-20">
          <!-- Left: Timeline -->
          <div class="flex-1">
            <p
              class="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-3"
            >
              Schedule & Format
            </p>
            <h2
              class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-10"
            >
              Contest Details
            </h2>

            <div class="relative pl-8">
              <!-- Vertical rail -->
              <div
                class="timeline-rail absolute left-3 top-2 bottom-4 w-px"
                aria-hidden="true"
              ></div>

              <div class="space-y-8">
                <!-- Dynamic date item -->
                <div v-if="viewingExam" class="relative">
                  <div
                    class="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20"
                  ></div>
                  <h4
                    class="text-base font-bold text-slate-900 dark:text-white mb-1"
                  >
                    {{ examDate }}
                  </h4>
                  <p
                    class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                  >
                    The contest runs for {{ examDuration }}.
                  </p>
                </div>
                <!-- Skeleton for date -->
                <div v-else-if="loading" class="relative">
                  <div
                    class="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse"
                  ></div>
                  <div
                    class="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 animate-pulse mb-2"
                    style="border-radius: 4px"
                  />
                  <div
                    class="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 animate-pulse"
                    style="border-radius: 4px"
                  />
                </div>

                <!-- Static detail items -->
                <div v-for="(detail, i) in details" :key="i" class="relative">
                  <div
                    class="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-background-light dark:ring-background-dark"
                  ></div>
                  <h4
                    class="text-base font-bold text-slate-900 dark:text-white mb-1"
                  >
                    {{ detail.title }}
                  </h4>
                  <p
                    class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                  >
                    {{ detail.desc }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- RULES                                                         -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <section
        id="rules"
        class="py-20 md:py-24 bg-slate-50/70 dark:bg-accent-navy/15 backdrop-blur-sm"
      >
        <div class="max-w-[1200px] mx-auto px-6">
          <!-- Heading -->
          <div class="text-center mb-14">
            <p
              class="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-3"
            >
              Guidelines
            </p>
            <h2
              class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3"
            >
              Official Rules
            </h2>
            <div
              class="h-1 w-12 bg-primary mx-auto mb-4"
              style="border-radius: 2px"
            ></div>
            <p
              class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto"
            >
              Please adhere to the following guidelines to ensure a fair
              competition for everyone.
            </p>
          </div>

          <!-- Rules grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              v-for="(rule, i) in rules"
              :key="i"
              class="group relative flex gap-5 items-start bg-white dark:bg-background-dark border border-slate-200 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/20 p-6 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 overflow-hidden"
              style="border-radius: 10px"
            >
              <!-- Hover top-edge line -->
              <div
                class="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-primary to-transparent transition-all duration-300 pointer-events-none"
                aria-hidden="true"
              ></div>

              <!-- Number badge -->
              <div
                class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-white text-sm font-black shadow-lg shadow-primary/25 group-hover:shadow-primary/45 transition-shadow"
                style="border-radius: 8px"
              >
                {{ rule.num }}
              </div>

              <div>
                <h4 class="font-bold text-slate-900 dark:text-white mb-1.5">
                  {{ rule.title }}
                </h4>
                <p
                  class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                >
                  {{ rule.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ── Footer ─────────────────────────────────────────────────────── -->
    <footer
      class="relative z-10 border-t border-slate-200 dark:border-slate-800 py-6 px-6 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm"
    >
      <div
        class="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <span class="text-xs text-slate-400 dark:text-slate-600">
          &copy; {{ new Date().getFullYear()
          }}{{ brand.copyrightHolder ? ` ${brand.copyrightHolder}` : '' }}
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Mobile menu slide ── */
.slide-enter-active,
.slide-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* ── Ambient dot-grid texture ── */
.dot-grid {
  background-image: radial-gradient(
    circle,
    currentColor 1.5px,
    transparent 1.5px
  );
  background-size: 22px 22px;
}

/* ── Ambient blobs ── */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(88px);
  will-change: transform;
}

html:not(.dark) .blob {
  opacity: 0.3;
}

.blob-1 {
  width: 540px;
  height: 540px;
  background: radial-gradient(
    circle,
    rgb(var(--color-primary) / 0.32) 0%,
    transparent 70%
  );
  top: -180px;
  left: -140px;
  animation: drift1 15s ease-in-out infinite;
}

.blob-2 {
  width: 640px;
  height: 640px;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.22) 0%,
    transparent 70%
  );
  bottom: -220px;
  right: -200px;
  animation: drift2 19s ease-in-out infinite;
}

.blob-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(245, 158, 11, 0.14) 0%,
    transparent 70%
  );
  top: 38%;
  right: 8%;
  animation: drift3 12s ease-in-out infinite;
}

@keyframes drift1 {
  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(45px, 65px) scale(1.08);
  }
  66% {
    transform: translate(-30px, 28px) scale(0.95);
  }
}

@keyframes drift2 {
  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }
  40% {
    transform: translate(-65px, -45px) scale(1.1);
  }
  70% {
    transform: translate(32px, -18px) scale(0.92);
  }
}

@keyframes drift3 {
  0%,
  100% {
    transform: translate(0px, 0px) scale(1);
  }
  50% {
    transform: translate(-55px, 42px) scale(1.12);
  }
}

/* ── Terminal card float ── */
.terminal-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-12px);
  }
}

/* ── Blinking cursor ── */
.cursor-blink {
  animation: blink 1.1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* ── Hero countdown ── */
.hero-countdown {
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.03em;
  line-height: 1;
  background: linear-gradient(
    135deg,
    rgb(var(--color-primary)) 0%,
    rgb(var(--color-primary) / 0.6) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ── Timeline rail pulse ── */
.timeline-rail {
  background: linear-gradient(
    to bottom,
    rgb(var(--color-primary) / 0.7),
    rgb(var(--color-primary) / 0.15),
    transparent
  );
  animation: rail-pulse 3s ease-in-out infinite alternate;
}

@keyframes rail-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}
</style>
