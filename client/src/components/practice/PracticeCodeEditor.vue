<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMonaco } from '../../composables/useMonaco';
import { usePracticeStore } from '../../stores/practice';

const practiceStore = usePracticeStore();
const containerRef = ref<HTMLElement | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const copied = ref(false);

const monacoLanguage = computed(
  () => practiceStore.currentLanguage?.monacoLanguage ?? 'plaintext',
);

const code = computed({
  get: () => practiceStore.currentCode,
  set: (value: string) => {
    practiceStore.currentCode = value;
  },
});

const starterCode = computed(() => {
  const language = practiceStore.currentLanguage?.key;
  if (!practiceStore.currentProblem || !language) return '';
  return practiceStore.currentProblem.starterCode[language] ?? '';
});

const hasUnsavedChanges = computed(() => code.value !== starterCode.value);

useMonaco(containerRef, monacoLanguage, code, {
  variant: 'light',
  fontSize: 18,
  lineHeight: 40,
  paddingTop: 16,
});

function onLanguageChange(event: Event) {
  practiceStore.setLanguage((event.target as HTMLSelectElement).value);
}

function resetCode() {
  code.value = starterCode.value;
}

async function copyCode() {
  await navigator.clipboard.writeText(code.value);
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
          <h2 class="text-2xl font-semibold text-slate-950">代码</h2>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          :disabled="practiceStore.runningSample"
          @click="practiceStore.runSample"
        >
          <span class="material-symbols-outlined text-[18px]">play_arrow</span>
          {{ practiceStore.runningSample ? '运行中...' : '运行示例' }}
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
          class="rounded-xl border border-black/10 bg-white px-4 py-2 text-[17px] text-slate-700 outline-none"
          :value="practiceStore.currentLanguageKey"
          @change="onLanguageChange"
        >
          <option
            v-for="language in practiceStore.currentProblem
              ?.supportedLanguages ?? []"
            :key="language.key"
            :value="language.key"
          >
            {{ language.label }}
          </option>
        </select>

        <div
          class="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-500"
        >
          <span class="material-symbols-outlined text-[16px]">lock</span>
          本地练习模式
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

    <div ref="containerRef" class="min-h-0 flex-1 bg-white" />

    <div
      class="flex items-center justify-between border-t border-black/5 bg-white px-5 py-3 text-sm text-slate-400"
    >
      <span>{{ hasUnsavedChanges ? '已保存到浏览器草稿' : '已保存' }}</span>
      <span>编辑器已切换为练习模式</span>
    </div>
  </div>
</template>
