<script setup lang="ts">
import { ref, computed, watch, inject, type Ref } from 'vue';
import { useEditorStore } from '../../stores/editor';
import { useExamStore } from '../../stores/exam';
import { useUiStore } from '../../stores/ui';
import { useRunSubmitStore } from '../../stores/runSubmit';
import { useAuthStore } from '../../stores/auth';
import { useMonaco } from '../../composables/useMonaco';
import type { SaveStatus } from '../../composables/useAutosave';

const editorStore = useEditorStore();
const examStore = useExamStore();
const uiStore = useUiStore();
const runSubmit = useRunSubmitStore();
const authStore = useAuthStore();
const saveStatus = inject<Ref<SaveStatus>>('saveStatus');
const forceSave = inject<() => Promise<void>>('forceSave');
const containerRef = ref<HTMLElement | null>(null);

const monacoLang = computed(() => editorStore.language.monacoLang);
const code = computed({
  get: () => editorStore.code,
  set: (val: string) => {
    editorStore.code = val;
  },
});

const { editor } = useMonaco(containerRef, monacoLang, code);

watch(
  () => uiStore.activeTab,
  (tab) => {
    if (tab === 'code-editor')
      requestAnimationFrame(() => editor.value?.layout());
  },
);

watch(
  () => uiStore.editorExpanded,
  () => requestAnimationFrame(() => editor.value?.layout()),
);

const availableLanguages = computed(() => {
  const langs = editorStore.languages;
  const allowed = examStore.activeExam?.allowedLanguages as
    | (number | string)[]
    | undefined;
  if (!allowed || allowed.length === 0) return langs;
  return langs.filter((l) =>
    allowed.some((a) =>
      typeof a === 'number'
        ? a === l.id
        : String(a).toLowerCase() === l.name.toLowerCase(),
    ),
  );
});

function onLanguageChange(e: Event) {
  const id = parseInt((e.target as HTMLSelectElement).value, 10);
  const lang = editorStore.languages.find((l) => l.id === id);
  if (lang) editorStore.setLanguage(lang);
}

function resetCode() {
  editorStore.resetCode();
}

const copied = ref(false);
async function copyCode() {
  try {
    await navigator.clipboard.writeText(editorStore.code);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = editorStore.code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

// Ctrl+S → save, Ctrl+Enter → run, Escape → collapse expanded editor
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    void forceSave?.();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!runSubmit.running && authStore.isAuthenticated) void runSubmit.run();
  }
  if (e.key === 'Escape' && uiStore.editorExpanded) {
    e.preventDefault();
    uiStore.toggleEditorExpanded();
  }
}

const isSolved = computed(() => runSubmit.alreadySolved);

const fileExt = computed(() => {
  const map: Record<string, string> = {
    python: 'py',
    cpp: 'cpp',
    java: 'java',
    c: 'c',
    javascript: 'js',
  };
  return (
    map[editorStore.language.monacoLang] ?? editorStore.language.monacoLang
  );
});

const langStyle = computed(() => {
  const map: Record<string, { dot: string; label: string }> = {
    python: { dot: 'bg-yellow-400', label: 'text-yellow-400' },
    javascript: { dot: 'bg-yellow-300', label: 'text-yellow-300' },
    java: { dot: 'bg-orange-400', label: 'text-orange-400' },
    cpp: { dot: 'bg-blue-400', label: 'text-blue-400' },
    c: { dot: 'bg-sky-400', label: 'text-sky-400' },
  };
  return (
    map[editorStore.language.monacoLang] ?? {
      dot: 'bg-slate-400',
      label: 'text-slate-400',
    }
  );
});
</script>

<template>
  <div
    class="relative flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <!-- ── Solved overlay ────────────────────────────────────────────── -->
    <div
      v-show="isSolved"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-950"
    >
      <span class="material-symbols-outlined text-[56px] text-emerald-400"
        >check_circle</span
      >
      <div class="text-center">
        <p class="text-lg font-semibold text-emerald-400">Problem Solved</p>
        <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Your solution has been accepted.
        </p>
      </div>
    </div>

    <!-- ── Toolbar ──────────────────────────────────────────────────── -->
    <div
      class="flex items-center justify-between px-3 h-10 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0d1117] flex-shrink-0 gap-3"
    >
      <!-- Left: language selector + file tab -->
      <div class="flex items-center gap-2 min-w-0">
        <!-- Language selector -->
        <div class="relative group flex-shrink-0">
          <select
            class="lang-select"
            :value="String(editorStore.language.id)"
            :disabled="!editorStore.languagesReady"
            @change="onLanguageChange"
          >
            <option
              v-for="lang in availableLanguages"
              :key="lang.id"
              :value="String(lang.id)"
            >
              {{ lang.name }}
            </option>
          </select>
          <!-- Tooltip when locked -->
          <div v-if="!editorStore.languagesReady" class="lang-tooltip">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[13px]">🔒</span>
              <span
                class="text-[11px] font-semibold text-slate-800 dark:text-white"
                >Languages not unlocked yet</span
              >
            </div>
            <p
              class="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed"
            >
              You haven't unlocked the languages yet. Take a look around -
              you'll figure it out!
            </p>
          </div>
        </div>

        <!-- File tab pill -->
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-white/[0.07] min-w-0"
        >
          <span
            class="w-1.5 h-1.5 rounded-full flex-shrink-0"
            :class="langStyle.dot"
          />
          <span
            class="font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate"
            >solution.{{ fileExt }}</span
          >
        </div>
      </div>

      <!-- Right: save status + actions + shortcut -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <!-- Autosave status -->
        <Transition name="fade">
          <span
            v-if="saveStatus && saveStatus !== 'idle'"
            class="flex items-center gap-1 text-[10px] mr-1 select-none"
          >
            <span v-if="saveStatus === 'saving'" class="save-spinner" />
            <span
              v-else-if="saveStatus === 'saved'"
              class="material-symbols-outlined text-[12px] text-emerald-400"
              >check_circle</span
            >
            <span
              v-else-if="saveStatus === 'error'"
              class="material-symbols-outlined text-[12px] text-red-400"
              >error</span
            >
            <span
              :class="{
                'text-slate-500': saveStatus === 'saving',
                'text-emerald-400': saveStatus === 'saved',
                'text-red-400': saveStatus === 'error',
              }"
              >{{
                saveStatus === 'saving'
                  ? 'Saving…'
                  : saveStatus === 'saved'
                    ? 'Saved'
                    : 'Failed'
              }}</span
            >
          </span>
        </Transition>

        <!-- Reset -->
        <button
          class="toolbar-btn group"
          title="Reset to starter"
          @click="resetCode"
        >
          <span class="material-symbols-outlined text-[15px]">restart_alt</span>
          <span class="toolbar-tip">Reset</span>
        </button>

        <!-- Copy -->
        <button class="toolbar-btn group" @click="copyCode">
          <span
            class="material-symbols-outlined text-[15px]"
            :class="copied ? 'text-emerald-400' : ''"
          >
            {{ copied ? 'check' : 'content_copy' }}
          </span>
          <span class="toolbar-tip">{{ copied ? 'Copied!' : 'Copy' }}</span>
        </button>

        <!-- Expand / collapse -->
        <button
          class="toolbar-btn group"
          @click="uiStore.toggleEditorExpanded()"
        >
          <span class="material-symbols-outlined text-[15px]">
            {{ uiStore.editorExpanded ? 'close_fullscreen' : 'open_in_full' }}
          </span>
          <span class="toolbar-tip">{{
            uiStore.editorExpanded ? 'Collapse (Esc)' : 'Expand editor'
          }}</span>
        </button>

        <!-- Keyboard shortcut hint -->
        <div
          class="hidden lg:flex items-center gap-1 ml-1.5 pl-2 border-l border-slate-200 dark:border-white/[0.06]"
        >
          <kbd class="kbd">Ctrl</kbd>
          <span class="text-[9px] text-slate-400 dark:text-slate-500">+</span>
          <kbd class="kbd">↵</kbd>
          <span class="text-[9px] text-slate-400 dark:text-slate-500 ml-0.5"
            >run</span
          >
        </div>
      </div>
    </div>

    <!-- ── Monaco container ─────────────────────────────────────────── -->
    <div ref="containerRef" class="flex-1 min-h-0" />
  </div>
</template>

<style scoped>
/* ── Language select ── */
.lang-select {
  @apply appearance-none rounded-md px-2.5 py-1
         text-[11px] font-medium outline-none cursor-pointer
         disabled:opacity-40 disabled:cursor-not-allowed transition-colors
         bg-slate-100 dark:bg-slate-800/80
         border border-slate-200 dark:border-white/[0.08]
         text-slate-700 dark:text-slate-300
         hover:border-slate-300 dark:hover:border-white/[0.14];
  min-width: 110px;
}

/* ── Lock tooltip ── */
.lang-tooltip {
  @apply absolute left-0 top-full mt-2 z-50 w-56 pointer-events-none
         opacity-0 group-hover:opacity-100 transition-opacity duration-150;
  @apply bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10
         rounded-xl p-3 shadow-2xl;
}

/* ── Toolbar icon buttons ── */
.toolbar-btn {
  @apply relative flex items-center justify-center w-7 h-7 rounded-md
         text-slate-400 dark:text-slate-500
         hover:text-slate-700 dark:hover:text-slate-200
         hover:bg-slate-100 dark:hover:bg-white/[0.06]
         transition-all cursor-pointer;
}
.toolbar-tip {
  @apply absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5
         text-[10px] text-white bg-slate-700 dark:bg-slate-600 rounded whitespace-nowrap
         pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity;
}

/* ── Keyboard hint ── */
.kbd {
  @apply inline-flex items-center justify-center px-1.5 py-0.5
         text-[9px] font-mono rounded leading-none
         text-slate-400 dark:text-slate-500
         bg-slate-100 dark:bg-slate-800
         border border-slate-200 dark:border-white/[0.08];
}

/* ── Save spinner ── */
.save-spinner {
  @apply w-2.5 h-2.5 rounded-full border-2
         border-slate-300 dark:border-slate-600
         border-t-slate-500 dark:border-t-slate-300
         animate-spin inline-block;
}

/* ── Fade transition ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
