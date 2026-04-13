<script setup lang="ts">
// ═══════════════════════════════════════════════════════════════════════
// PRESERVED: ALL logic is identical to the original implementation.
// Only the <template> and <style> sections have been redesigned.
// ═══════════════════════════════════════════════════════════════════════
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../../stores/auth';
import { useExamStore } from '../../stores/exam';
import { useProblemsStore } from '../../stores/problems';
import { useEditorStore } from '../../stores/editor';
import { useResizable } from '../../composables/useResizable';
import { prefetchAutosave } from '../../composables/useAutosave';
import type { User, Exam, Problem } from '../../types';

const authStore = useAuthStore();
const examStore = useExamStore();
const problemsStore = useProblemsStore();
const editorStore = useEditorStore();

// --- localStorage persistence helpers --- PRESERVED
const LS_KEY = 'apiClientState';

let headerIdCounter = 0;

interface HeaderRow {
  id: number;
  key: string;
  value: string;
  enabled: boolean;
}

interface SavedState {
  method: string;
  url: string;
  bodyText: string;
  headers: HeaderRow[];
}

function makeHeader(key: string, value: string, enabled: boolean): HeaderRow {
  return { id: ++headerIdCounter, key, value, enabled };
}

const DEFAULT_HEADERS: HeaderRow[] = [
  makeHeader('Content-Type', 'application/json', true),
  makeHeader('Authorization', 'Bearer ', false),
];

interface LegacySavedState {
  method: string;
  bodyText: string;
  path?: string;
  baseUrl?: string;
  url?: string;
}

function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LegacySavedState;
      // Migrate old format (baseUrl + path) to new (url)
      if (parsed.path !== undefined) {
        const base = (parsed.baseUrl ?? '').replace(/\/+$/, '');
        return {
          method: parsed.method,
          bodyText: parsed.bodyText,
          url: base ? base + parsed.path : parsed.path,
          headers: DEFAULT_HEADERS.map((h) =>
            makeHeader(h.key, h.value, h.enabled),
          ),
        };
      }
      return {
        method: parsed.method,
        url: parsed.url ?? '/api/exams/upcoming',
        bodyText: parsed.bodyText,
        headers: DEFAULT_HEADERS.map((h) =>
          makeHeader(h.key, h.value, h.enabled),
        ),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    method: 'GET',
    url: '/api/exams/upcoming',
    bodyText: '',
    headers: DEFAULT_HEADERS.map((h) => makeHeader(h.key, h.value, h.enabled)),
  };
}

const saved = loadState();
const method = ref<string>(saved.method);
const url = ref(saved.url);
const bodyText = ref(saved.bodyText);
const activeSubTab = ref<'body' | 'headers'>('body');
const loading = ref(false);
const methodDropdownOpen = ref(false);

// ── Resizable split ──────────────────────────────────────────────────────────
const requestWidth = ref(48); // percent
const { onMouseDown: onDividerMouseDown } = useResizable(
  'vertical',
  (delta) => {
    const container = document.getElementById('api-client-root');
    if (!container) return;
    const totalWidth = container.clientWidth;
    const deltaPct = (delta / totalWidth) * 100;
    requestWidth.value = Math.min(
      75,
      Math.max(25, requestWidth.value + deltaPct),
    );
  },
);

function closeMethodDropdown(e: MouseEvent) {
  const el = document.getElementById('method-select-root');
  if (el && !el.contains(e.target as Node)) methodDropdownOpen.value = false;
}

onMounted(() => document.addEventListener('mousedown', closeMethodDropdown));
onUnmounted(() =>
  document.removeEventListener('mousedown', closeMethodDropdown),
);
const detectedHint = ref<string | null>(null);
let hintTimer: ReturnType<typeof setTimeout> | null = null;
const copiedResponse = ref(false);

const headers = ref<HeaderRow[]>(saved.headers);

// PRESERVED: auto-persist state
function persistState() {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      method: method.value,
      url: url.value,
      bodyText: bodyText.value,
      headers: headers.value,
    }),
  );
}

watch([method, url, bodyText, headers], persistState, { deep: true });

// PRESERVED: header management
function addHeaderRow() {
  headers.value.push(makeHeader('', '', true));
}
function removeHeaderRow(i: number) {
  headers.value.splice(i, 1);
}

// PRESERVED: response state
const responseData = ref<{
  status: number;
  statusText: string;
  data: unknown;
  time: number;
} | null>(null);

// NEW: response size
const responseSize = computed(() => {
  if (!responseData.value) return '';
  const bytes = new Blob([JSON.stringify(responseData.value.data)]).size;
  return bytes < 1024 ? `${bytes}B` : `${(bytes / 1024).toFixed(1)}KB`;
});

// PRESERVED: hint system
function showHint(msg: string) {
  detectedHint.value = msg;
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    detectedHint.value = null;
  }, 4000);
}

// PRESERVED: smart response detection
function tryParseResponse(status: number, data: unknown) {
  if (status < 200 || status >= 300 || !data) return;
  const p = url.value.replace(/\/+$/, '');

  if (/\/api\/auth\/(login|refresh)$/.test(p) && isObj(data)) {
    const d = data;
    if (typeof d.accessToken === 'string') {
      authStore.setToken(d.accessToken);
      if (isObj(d.user)) authStore.setUser(d.user as unknown as User);
      void examStore.fetchMyProgress();
      void prefetchAutosave();
      void editorStore.fetchLanguages();
      showHint('JWT captured - make sure to copy it');
    }
  }

  if (/\/api\/auth\/me$/.test(p) && isObj(data)) {
    const d = data;
    if (typeof d.id === 'number' && typeof d.email === 'string') {
      authStore.setUser(d as unknown as User);
      showHint('User profile refreshed');
    }
  }

  if (/\/api\/exams\/(?:active|upcoming)$/.test(p) && isObj(data)) {
    const d = data;
    // New envelope format: { data: Exam[], metadata: { serverTime } }
    if (Array.isArray(d.data) && d.data.length > 0) {
      showHint(`${d.data.length} exam(s) fetched`);
    } else if (typeof d.id === 'number' && typeof d.title === 'string') {
      examStore.selectExam(data as unknown as Exam);
      showHint('Active exam cached');
    }
  }

  if (/\/api\/exams\/\d+\/problems\/?$/.test(p) && Array.isArray(data)) {
    if (data.length > 0 && isObj(data[0]) && 'title' in data[0]) {
      problemsStore.setProblems(data as Problem[]);
      if (!editorStore.activeProblemId && data.length > 0) {
        editorStore.setActiveProblem((data[0] as unknown as Problem).id);
      }
      showHint(`${data.length} problem(s) loaded`);
    }
  }

  if (/\/api\/languages\/?$/.test(p) && Array.isArray(data)) {
    if (data.length > 0 && isObj(data[0]) && 'name' in data[0]) {
      editorStore.setLanguages(data as { id: number; name: string }[]);
      showHint(`${data.length} language(s) loaded`);
    }
  }

  // Detect single problem - cache full detail for the Problem Modal
  if (
    method.value === 'GET' &&
    /^\/api\/exams\/\d+\/problems\/\d+$/.test(p) &&
    isObj(data)
  ) {
    const d = data;
    if (typeof d.id === 'number') {
      problemsStore.cacheProblemDetail(data as unknown as Problem);
      showHint(`Problem #${d.id} detail cached`);
    }
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// PRESERVED: send function
async function send() {
  loading.value = true;
  responseData.value = null;
  const start = performance.now();

  const reqHeaders: Record<string, string> = {};
  for (const row of headers.value) {
    const k = row.key.trim();
    if (k && row.enabled) reqHeaders[k] = row.value;
  }

  try {
    let body: unknown = undefined;
    if (bodyText.value && method.value !== 'GET') {
      try {
        body = JSON.parse(bodyText.value);
      } catch {
        body = bodyText.value;
      }
    }

    const res = await axios({
      method: method.value,
      url: url.value,
      data: body,
      headers: reqHeaders,
      validateStatus: () => true,
    });

    responseData.value = {
      status: res.status,
      statusText: res.statusText,
      data: res.data,
      time: Math.round(performance.now() - start),
    };

    tryParseResponse(res.status, res.data);
  } catch (err) {
    responseData.value = {
      status: 0,
      statusText: 'Network Error',
      data: { error: err instanceof Error ? err.message : 'Request failed' },
      time: Math.round(performance.now() - start),
    };
  } finally {
    loading.value = false;
  }
}

// PRESERVED: formatting
function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

// NEW: copy response to clipboard
function copyResponse() {
  if (!responseData.value) return;
  void navigator.clipboard.writeText(formatJson(responseData.value.data));
  copiedResponse.value = true;
  setTimeout(() => (copiedResponse.value = false), 2000);
}

// Method badge colors
const methodColors: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-red-400',
};

const methodBg: Record<string, string> = {
  GET: 'border-emerald-500/20 dark:border-emerald-500/20',
  POST: 'border-yellow-500/20 dark:border-yellow-500/20',
  PUT: 'border-blue-500/20 dark:border-blue-500/20',
  PATCH: 'border-purple-500/20 dark:border-purple-500/20',
  DELETE: 'border-red-500/20 dark:border-red-500/20',
};

const methodPillClass: Record<string, string> = {
  GET: 'pill-get',
  POST: 'pill-post',
  PUT: 'pill-put',
  PATCH: 'pill-patch',
  DELETE: 'pill-delete',
};

function statusClasses(status: number): string {
  if (status === 0)
    return 'bg-red-500/10 text-red-400 border border-red-500/20';
  if (status < 300)
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (status < 400)
    return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  if (status < 500)
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
  return 'bg-red-500/10 text-red-400 border border-red-500/20';
}
</script>

<template>
  <div
    id="api-client-root"
    class="flex h-full overflow-hidden bg-white dark:bg-background-dark text-sm"
  >
    <!-- ── Request Pane ─────────────────────────────────────────────── -->
    <div class="flex flex-col min-w-0" :style="{ width: requestWidth + '%' }">
      <!-- URL bar -->
      <div
        class="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0"
      >
        <!-- Custom method dropdown -->
        <div id="method-select-root" class="relative flex-shrink-0">
          <button
            class="method-btn"
            :class="methodBg[method]"
            @click="methodDropdownOpen = !methodDropdownOpen"
          >
            <span
              :class="methodColors[method]"
              class="font-bold text-[11px] tracking-wide"
              >{{ method }}</span
            >
            <span
              class="material-symbols-outlined text-[13px] text-slate-400 ml-0.5"
              >expand_more</span
            >
          </button>
          <Transition name="pop">
            <div v-if="methodDropdownOpen" class="method-dropdown">
              <button
                v-for="m in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']"
                :key="m"
                class="method-option"
                :class="method === m ? 'bg-slate-100 dark:bg-white/[0.06]' : ''"
                @click="
                  method = m;
                  methodDropdownOpen = false;
                "
              >
                <span class="method-pill" :class="methodPillClass[m]">{{
                  m
                }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- URL input -->
        <input
          v-model="url"
          class="url-input"
          placeholder="/api/exams/upcoming"
          spellcheck="false"
          @keydown.enter="send"
          @input="(e: Event) => (url = (e.target as HTMLInputElement).value)"
        />

        <!-- Send button -->
        <button
          class="send-btn"
          :class="loading ? 'opacity-60 cursor-wait' : ''"
          :disabled="loading"
          @click="send"
        >
          <span v-if="loading" class="spinner" />
          <span v-else class="material-symbols-outlined text-[15px]">send</span>
          <span>{{ loading ? 'Sending' : 'Send' }}</span>
        </button>
      </div>

      <!-- Sub-tabs -->
      <div
        class="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0"
      >
        <button
          class="sub-tab"
          :class="activeSubTab === 'body' ? 'sub-tab-active' : 'sub-tab-idle'"
          @click="activeSubTab = 'body'"
        >
          Body
        </button>
        <button
          class="sub-tab"
          :class="
            activeSubTab === 'headers' ? 'sub-tab-active' : 'sub-tab-idle'
          "
          @click="activeSubTab = 'headers'"
        >
          Headers
          <span
            class="ml-1 px-1.5 py-px rounded-full text-[9px] font-bold"
            :class="
              activeSubTab === 'headers'
                ? 'bg-primary/20 text-primary'
                : 'bg-slate-200 dark:bg-white/10 text-slate-500'
            "
          >
            {{ headers.length }}
          </span>
        </button>
        <span class="ml-auto text-[10px] text-slate-300 dark:text-slate-600"
          >Enter to send</span
        >
      </div>

      <!-- Body / Headers -->
      <div class="flex-1 overflow-auto">
        <!-- Body -->
        <div v-if="activeSubTab === 'body'" class="h-full p-3">
          <textarea
            v-model="bodyText"
            class="body-editor"
            placeholder='{ "key": "value" }'
            spellcheck="false"
            @input="
              (e: Event) => (bodyText = (e.target as HTMLTextAreaElement).value)
            "
          />
        </div>

        <!-- Headers -->
        <div v-if="activeSubTab === 'headers'" class="p-3 flex flex-col gap-0">
          <!-- Column headers -->
          <div
            class="grid grid-cols-[20px_1fr_1fr_24px] gap-2 px-2 pb-1.5 mb-1 border-b border-slate-100 dark:border-white/[0.04]"
          >
            <span></span>
            <span
              class="text-[9px] font-semibold uppercase tracking-widest text-slate-400"
              >Key</span
            >
            <span
              class="text-[9px] font-semibold uppercase tracking-widest text-slate-400"
              >Value</span
            >
            <span></span>
          </div>
          <div
            v-for="(row, i) in headers"
            :key="row.id"
            class="grid grid-cols-[20px_1fr_1fr_24px] gap-2 items-center px-2 py-1.5 rounded-lg transition-colors"
            :class="
              row.enabled
                ? 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                : 'opacity-40'
            "
          >
            <input
              v-model="row.enabled"
              type="checkbox"
              class="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
            />
            <input
              v-model="row.key"
              class="header-input"
              placeholder="Header-Name"
              @input="
                (e: Event) => (row.key = (e.target as HTMLInputElement).value)
              "
            />
            <input
              v-model="row.value"
              class="header-input"
              placeholder="value"
              @input="
                (e: Event) => (row.value = (e.target as HTMLInputElement).value)
              "
            />
            <button
              class="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center"
              @click="removeHeaderRow(i)"
            >
              <span class="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>
          <button class="add-header-btn" @click="addHeaderRow">
            <span class="material-symbols-outlined text-[14px]">add</span> Add
            Header
          </button>
        </div>
      </div>
    </div>

    <!-- ── Divider ──────────────────────────────────────────────────── -->
    <div class="pane-divider" @mousedown="onDividerMouseDown" />

    <!-- ── Response Pane ────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Response toolbar -->
      <div
        class="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01] flex-shrink-0 min-h-[44px]"
      >
        <span
          class="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >Response</span
        >

        <!-- Status badge + meta -->
        <template v-if="responseData">
          <span
            class="status-badge"
            :class="statusClasses(responseData.status)"
          >
            {{ responseData.status }} {{ responseData.statusText }}
          </span>
          <span class="meta-chip">{{ responseData.time }}ms</span>
          <span class="meta-chip">{{ responseSize }}</span>
        </template>

        <!-- Hint -->
        <Transition name="hint">
          <span
            v-if="detectedHint"
            class="flex items-center gap-1 text-[10px] text-emerald-400"
          >
            <span class="material-symbols-outlined text-[12px]"
              >auto_awesome</span
            >{{ detectedHint }}
          </span>
        </Transition>

        <div class="flex-1" />

        <button v-if="responseData" class="copy-btn" @click="copyResponse">
          <span class="material-symbols-outlined text-[13px]">{{
            copiedResponse ? 'check' : 'content_copy'
          }}</span>
          {{ copiedResponse ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <!-- Response body -->
      <div class="flex-1 overflow-auto p-3">
        <div
          v-if="!responseData"
          class="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-600"
        >
          <span class="material-symbols-outlined text-[36px] opacity-30"
            >arrow_forward</span
          >
          <span class="text-xs">Send a request to see the response</span>
        </div>
        <pre
          v-else
          class="response-pre"
        ><code>{{ formatJson(responseData.data) }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Method dropdown ── */
.method-btn {
  @apply flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all select-none;
  @apply bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18];
  min-width: 100px;
}
.method-dropdown {
  @apply absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden py-1.5;
  min-width: 120px;
}
.method-option {
  @apply flex items-center justify-center w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer;
}
.method-pill {
  @apply inline-block font-bold text-[11px] tracking-widest px-2.5 py-1 rounded-md w-full text-center;
}

/* Method colors */
.pill-get {
  @apply bg-emerald-500/10 text-emerald-500;
}
.pill-post {
  @apply bg-yellow-500/10  text-yellow-500;
}
.pill-put {
  @apply bg-blue-500/10    text-blue-400;
}
.pill-patch {
  @apply bg-purple-500/10  text-purple-400;
}
.pill-delete {
  @apply bg-red-500/10     text-red-400;
}

/* ── URL input ── */
.url-input {
  @apply flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5;
  @apply font-mono text-[12px] text-slate-800 dark:text-slate-200 outline-none;
  @apply focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition-colors;
  @apply placeholder-slate-400 dark:placeholder-slate-600;
}

/* ── Send button ── */
.send-btn {
  @apply flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-white;
  @apply bg-primary hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0;
}

/* ── Sub-tabs ── */
.sub-tab {
  @apply flex items-center px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer;
}
.sub-tab-active {
  @apply bg-primary/10 text-primary;
}
.sub-tab-idle {
  @apply text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04];
}

/* ── Body editor ── */
.body-editor {
  @apply w-full h-full min-h-[80px] resize-none outline-none;
  @apply bg-slate-950 dark:bg-slate-950 border border-white/[0.06] rounded-xl p-4;
  @apply font-mono text-[12px] text-slate-200 leading-relaxed;
  @apply placeholder-slate-600 focus:border-primary/20 transition-colors;
}

/* ── Header inputs ── */
.header-input {
  @apply w-full bg-transparent border-none outline-none font-mono text-[11px];
  @apply text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 min-w-0;
}
.add-header-btn {
  @apply flex items-center gap-1 mt-2 mx-2 px-3 py-1.5 rounded-lg;
  @apply border border-dashed border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-400;
  @apply hover:text-primary hover:border-primary/30 transition-colors cursor-pointer;
}

/* ── Response ── */
.status-badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono;
}
.meta-chip {
  @apply text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded;
}
.copy-btn {
  @apply flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05];
}
.response-pre {
  @apply bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] rounded-xl p-4;
  @apply overflow-auto text-[11px] leading-relaxed font-mono text-slate-800 dark:text-slate-300;
  @apply whitespace-pre-wrap break-words;
}

/* ── Pane divider ── */
.pane-divider {
  @apply w-1 flex-shrink-0 cursor-col-resize bg-slate-200 dark:bg-white/[0.06] hover:bg-primary/40 transition-colors select-none;
}

/* ── Animations ── */
.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.3s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}

.spinner {
  @apply w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block;
}
</style>
