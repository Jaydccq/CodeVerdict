<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMonaco } from '../../composables/useMonaco';
import { usePracticeStore } from '../../stores/practice';

const practiceStore = usePracticeStore();
const containerRef = ref<HTMLElement | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const copied = ref(false);
const activeFilePath = ref('');
const openTabs = ref<string[]>([]);

const isDebugWorkspace = computed(
  () => practiceStore.currentProblem?.questionType === 'debug-workspace',
);

const monacoLanguage = computed(() => {
  if (isDebugWorkspace.value) return 'javascript';
  return practiceStore.currentLanguage?.monacoLanguage ?? 'plaintext';
});

const debugFiles = computed(() => practiceStore.currentDebugFiles);
const debugEntryFiles = computed(
  () => practiceStore.currentProblem?.debugWorkspace?.entryFiles ?? [],
);

const activeDebugFile = computed(() => {
  return (
    debugFiles.value.find((file) => file.path === activeFilePath.value) ?? null
  );
});

const editorContent = computed({
  get: () => {
    if (isDebugWorkspace.value) {
      return activeDebugFile.value?.content ?? '';
    }
    return practiceStore.currentCode;
  },
  set: (value: string) => {
    if (isDebugWorkspace.value) {
      if (!activeFilePath.value) return;
      practiceStore.setDebugFileContent(activeFilePath.value, value);
      return;
    }
    practiceStore.currentCode = value;
  },
});

const starterCode = computed(() => {
  const language = practiceStore.currentLanguage?.key;
  if (!practiceStore.currentProblem || !language) return '';
  return practiceStore.currentProblem.starterCode[language] ?? '';
});

const editorReadOnly = computed(
  () => isDebugWorkspace.value && !activeDebugFile.value?.editable,
);

const hasUnsavedChanges = computed(() => {
  if (isDebugWorkspace.value) {
    if (!activeDebugFile.value) return false;
    const original = practiceStore.currentProblem?.debugWorkspace?.files.find(
      (file) => file.path === activeDebugFile.value?.path,
    );
    return activeDebugFile.value.content !== (original?.content ?? '');
  }
  return editorContent.value !== starterCode.value;
});

useMonaco(containerRef, monacoLanguage, editorContent, {
  variant: 'light',
  fontSize: 18,
  lineHeight: 40,
  paddingTop: 16,
  readOnly: editorReadOnly,
});

function initializeDebugWorkspace() {
  if (!isDebugWorkspace.value || debugFiles.value.length === 0) {
    activeFilePath.value = '';
    openTabs.value = [];
    return;
  }

  const preferred = debugEntryFiles.value.filter((path) =>
    debugFiles.value.some((file) => file.path === path),
  );
  const fallback = debugFiles.value[0]?.path;
  const initialTabs = preferred.length > 0 ? preferred : fallback ? [fallback] : [];
  openTabs.value = Array.from(new Set(initialTabs));
  activeFilePath.value = openTabs.value[0] ?? '';
}

watch(
  () => practiceStore.currentProblem?.slug,
  () => {
    initializeDebugWorkspace();
  },
  { immediate: true },
);

function onLanguageChange(event: Event) {
  practiceStore.setLanguage((event.target as HTMLSelectElement).value);
}

function resetCode() {
  if (isDebugWorkspace.value) {
    if (!activeFilePath.value) return;
    practiceStore.resetDebugFile(activeFilePath.value);
    return;
  }
  editorContent.value = starterCode.value;
}

async function copyCode() {
  await navigator.clipboard.writeText(editorContent.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}

async function toggleFullscreen() {
  if (!cardRef.value) return;

  if (document.fullscreenElement === cardRef.value) {
    await document.exitFullscreen();
    return;
  }

  await cardRef.value.requestFullscreen();
}

function openDebugFile(filePath: string) {
  if (!openTabs.value.includes(filePath)) {
    openTabs.value = [...openTabs.value, filePath];
  }
  activeFilePath.value = filePath;
}

function closeDebugTab(filePath: string) {
  openTabs.value = openTabs.value.filter((path) => path !== filePath);
  if (activeFilePath.value === filePath) {
    activeFilePath.value =
      openTabs.value[openTabs.value.length - 1] ??
      debugEntryFiles.value[0] ??
      debugFiles.value[0]?.path ??
      '';
  }
}
</script>

<template>
  <div
    ref="cardRef"
    class="flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
  >
    <div
      class="flex items-center justify-between border-b border-black/5 bg-white px-5 py-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"
        >
          <span class="material-symbols-outlined text-[22px]">code</span>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Workspace
          </p>
          <h2 class="text-2xl font-semibold text-slate-950">
            {{ isDebugWorkspace ? '调试工作区' : '代码' }}
          </h2>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          :disabled="practiceStore.runningSample"
          @click="practiceStore.runSample"
        >
          <span class="material-symbols-outlined text-[18px]">play_arrow</span>
          {{ practiceStore.runningSample ? '运行中...' : isDebugWorkspace ? '运行可见测试' : '运行示例' }}
        </button>
        <button
          class="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
          :disabled="practiceStore.submitting"
          @click="practiceStore.submit"
        >
          <span class="material-symbols-outlined text-[18px]">upload</span>
          {{ practiceStore.submitting ? '提交中...' : '提交' }}
        </button>
      </div>
    </div>

    <div
      class="flex items-center justify-between border-b border-black/5 bg-slate-50/80 px-5 py-3"
    >
      <div class="flex items-center gap-3">
        <select
          v-if="!isDebugWorkspace"
          class="rounded-xl border border-black/10 bg-white px-4 py-2 text-[17px] text-slate-700 outline-none"
          :value="practiceStore.currentLanguageKey"
          @change="onLanguageChange"
        >
          <option
            v-for="language in practiceStore.currentProblem?.supportedLanguages ?? []"
            :key="language.key"
            :value="language.key"
          >
            {{ language.label }}
          </option>
        </select>

        <div
          class="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-500"
        >
          <span class="material-symbols-outlined text-[16px]">
            {{ isDebugWorkspace ? 'folder_code' : 'lock' }}
          </span>
          {{ isDebugWorkspace ? '多文件调试模式' : '本地练习模式' }}
        </div>

        <div
          v-if="isDebugWorkspace && activeDebugFile"
          class="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-600"
        >
          {{ activeDebugFile.editable ? '可编辑文件' : '只读文件' }}
        </div>
      </div>

      <div class="flex items-center gap-2 text-slate-500">
        <button
          class="rounded-xl border border-black/10 bg-white p-2 transition hover:bg-slate-100"
          title="重置代码"
          @click="resetCode"
        >
          <span class="material-symbols-outlined text-[20px]">restart_alt</span>
        </button>
        <button
          class="rounded-xl border border-black/10 bg-white p-2 transition hover:bg-slate-100"
          title="复制代码"
          @click="copyCode"
        >
          <span class="material-symbols-outlined text-[20px]">
            {{ copied ? 'check' : 'content_copy' }}
          </span>
        </button>
        <button
          class="rounded-xl border border-black/10 bg-white p-2 transition hover:bg-slate-100"
          title="全屏"
          @click="toggleFullscreen"
        >
          <span class="material-symbols-outlined text-[20px]">open_in_full</span>
        </button>
      </div>
    </div>

    <div v-if="isDebugWorkspace" class="min-h-0 flex flex-1">
      <aside
        class="flex w-[260px] flex-col border-r border-black/5 bg-slate-50/70"
      >
        <div class="border-b border-black/5 px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Files
          </p>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            v-for="file in debugFiles"
            :key="file.path"
            class="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition"
            :class="
              activeFilePath === file.path
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-white/80'
            "
            @click="openDebugFile(file.path)"
          >
            <span class="truncate">{{ file.path }}</span>
            <span class="ml-2 text-xs text-slate-400">
              {{ file.editable ? 'rw' : 'ro' }}
            </span>
          </button>
        </div>
      </aside>

      <div class="min-h-0 flex flex-1 flex-col bg-white">
        <div class="flex flex-wrap gap-2 border-b border-black/5 px-4 py-2">
          <button
            v-for="tab in openTabs"
            :key="tab"
            class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition"
            :class="
              activeFilePath === tab
                ? 'bg-slate-100 text-slate-950'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            "
            @click="openDebugFile(tab)"
          >
            <span class="max-w-[220px] truncate">{{ tab }}</span>
            <span
              class="material-symbols-outlined text-[16px] text-slate-400"
              @click.stop="closeDebugTab(tab)"
            >
              close
            </span>
          </button>
        </div>
        <div ref="containerRef" class="min-h-0 flex-1 bg-white" />
      </div>
    </div>

    <div v-else ref="containerRef" class="min-h-0 flex-1 bg-white" />

    <div
      class="flex items-center justify-between border-t border-black/5 bg-white px-5 py-3 text-sm text-slate-400"
    >
      <span>
        {{
          isDebugWorkspace
            ? practiceStore.savingDebugDraft
              ? '正在保存到服务器草稿...'
              : hasUnsavedChanges
                ? '已保存到服务器草稿'
                : '已同步'
            : hasUnsavedChanges
              ? '已保存到浏览器草稿'
              : '已保存'
        }}
      </span>
      <span>
        {{
          isDebugWorkspace
            ? activeDebugFile?.path ?? '选择一个文件开始调试'
            : '编辑器已切换为练习模式'
        }}
      </span>
    </div>
  </div>
</template>
