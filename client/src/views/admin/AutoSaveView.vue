<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAutoSave, deleteAutoSave } from '../../services/adminApi';
import type { AdminAutoSave } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';

const LANG_NAMES: Record<string, string> = {
  '50': 'C',
  '54': 'C++',
  '62': 'Java',
  '63': 'JavaScript',
  '71': 'Python',
};

const route = useRoute();
const router = useRouter();
const record = ref<AdminAutoSave | null>(null);
const loading = ref(true);
const error = ref('');
const errorRaw = ref('');
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const expandedProblems = ref<Set<string>>(new Set());

// Parse flat "problemId_langId" keys into grouped { problemId -> [{ langId, code }] }
const groupedCodeState = computed(() => {
  const flat = record.value?.codeState;
  if (!flat) return [];
  const groups: Record<
    string,
    { langId: string; langName: string; code: string }[]
  > = {};
  for (const [key, code] of Object.entries(flat)) {
    const sep = key.lastIndexOf('_');
    const problemId = sep === -1 ? key : key.slice(0, sep);
    const langId = sep === -1 ? '?' : key.slice(sep + 1);
    if (!groups[problemId]) groups[problemId] = [];
    groups[problemId].push({
      langId,
      langName: LANG_NAMES[langId] ?? `Lang ${langId}`,
      code: code as unknown as string,
    });
  }
  return Object.entries(groups).map(([problemId, langs]) => ({
    problemId,
    langs,
  }));
});

onMounted(async () => {
  loading.value = true;
  try {
    record.value = await getAutoSave(Number(route.params.id));
    if (record.value?.codeState) {
      // Auto-expand all problem groups
      const flat = record.value.codeState;
      const seen = new Set<string>();
      for (const key of Object.keys(flat)) {
        const sep = key.lastIndexOf('_');
        seen.add(sep === -1 ? key : key.slice(0, sep));
      }
      seen.forEach((k) => expandedProblems.value.add(k));
    }
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to load autosave record.';
    errorRaw.value = e.raw;
  } finally {
    loading.value = false;
  }
});

async function onDelete() {
  if (!record.value) return;
  deleting.value = true;
  try {
    await deleteAutoSave(record.value.id);
    void router.push({ name: 'admin-autosaves' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to delete record.';
    errorRaw.value = e.raw;
    showDeleteConfirm.value = false;
  } finally {
    deleting.value = false;
  }
}

function toggleProblem(key: string) {
  if (expandedProblems.value.has(key)) {
    expandedProblems.value.delete(key);
  } else {
    expandedProblems.value.add(key);
  }
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function extractError(err: unknown): { message: string; raw: string } {
  const ax = err as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  if (ax.response) {
    const respData = ax.response.data as { message?: string } | undefined;
    return {
      message: respData?.message ?? ax.response.statusText ?? 'Error',
      raw: `${ax.response.status} ${ax.response.statusText}: ${JSON.stringify(ax.response.data, null, 2)}`,
    };
  }
  return {
    message: ax.message ?? 'Unknown error',
    raw: ax.message ?? 'Unknown error',
  };
}
</script>

<template>
  <div class="max-w-[900px]">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <RegalButton @click="router.push({ name: 'admin-autosaves' })"
          >← Back</RegalButton
        >
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">
          AutoSave #{{ route.params.id }}
        </h2>
      </div>
      <RegalButton variant="danger" @click="showDeleteConfirm = true"
        >Delete</RegalButton
      >
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <div
      v-else-if="error"
      class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg"
    >
      <div class="font-medium">{{ error }}</div>
      <pre
        v-if="errorRaw"
        class="mt-2 font-mono text-xs text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap break-all"
        >{{ errorRaw }}</pre
      >
    </div>

    <template v-else-if="record">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Student</span
          >
          <span class="text-sm text-slate-900 dark:text-white"
            >{{ record.user?.firstName }} {{ record.user?.lastName }} ({{
              record.user?.rollNumber
            }})</span
          >
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Exam</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            record.exam?.title ?? '-'
          }}</span>
        </div>
        <div
          class="flex flex-col gap-1 px-3.5 py-2.5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Last Updated</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            fullDate(record.updatedAt)
          }}</span>
        </div>
      </div>

      <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Code State
      </h3>

      <div v-if="groupedCodeState.length === 0" class="text-sm text-slate-400">
        No saved code state.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="group in groupedCodeState"
          :key="group.problemId"
          class="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
        >
          <button
            class="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border-none cursor-pointer text-[13px] font-semibold text-slate-900 dark:text-white text-left hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
            @click="toggleProblem(group.problemId)"
          >
            <span class="text-[10px] text-slate-400">{{
              expandedProblems.has(group.problemId) ? '▼' : '▶'
            }}</span>
            <span>{{
              group.problemId === 'scratch'
                ? 'Scratch (no problem selected)'
                : `Problem #${group.problemId}`
            }}</span>
            <span class="ml-auto text-xs font-normal text-slate-400"
              >{{ group.langs.length }} language(s)</span
            >
          </button>
          <div
            v-if="expandedProblems.has(group.problemId)"
            class="px-3.5 py-3 flex flex-col gap-3"
          >
            <div
              v-for="entry in group.langs"
              :key="entry.langId"
              class="flex flex-col gap-1"
            >
              <div class="text-xs font-semibold text-slate-500">
                {{ entry.langName }}
                <span class="font-normal text-slate-400"
                  >(id: {{ entry.langId }})</span
                >
              </div>
              <pre
                class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto m-0"
              ><code>{{ entry.code }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </template>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete AutoSave Record"
      :message="`Delete this autosave record? This cannot be undone.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
