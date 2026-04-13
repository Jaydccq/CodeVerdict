<script setup lang="ts">
import { useExamStore } from '../../stores/exam';
import { useUiStore } from '../../stores/ui';
import { languageName } from '../../data/languages';

const examStore = useExamStore();
const uiStore = useUiStore();

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}
</script>

<template>
  <div
    v-if="!uiStore.bannerDismissed && examStore.activeExam"
    class="relative bg-white dark:bg-surface-dark border-l-2 border-l-primary px-5 py-3.5 mx-4 my-3 rounded-lg border border-slate-200 dark:border-white/[0.06]"
  >
    <button
      class="absolute top-2 right-3 text-slate-400 hover:text-slate-900 dark:hover:text-white text-base leading-none p-0.5 transition-colors"
      @click="uiStore.dismissBanner()"
    >
      &times;
    </button>
    <h2 class="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
      {{ examStore.activeExam.title }}
    </h2>
    <div class="flex gap-6 flex-wrap">
      <div class="flex flex-col text-xs text-slate-500 dark:text-slate-400">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 mb-px"
          >Duration</span
        >
        <span>{{ examStore.activeExam.durationMinutes }} min</span>
      </div>
      <div class="flex flex-col text-xs text-slate-500 dark:text-slate-400">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 mb-px"
          >Start</span
        >
        <span>{{ formatDate(examStore.activeExam.startTime) }}</span>
      </div>
      <div class="flex flex-col text-xs text-slate-500 dark:text-slate-400">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 mb-px"
          >End</span
        >
        <span>{{ formatDate(examStore.activeExam.endTime) }}</span>
      </div>
      <div class="flex flex-col text-xs text-slate-500 dark:text-slate-400">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 mb-px"
          >Languages</span
        >
        <span>{{
          examStore.activeExam.allowedLanguages.map(languageName).join(', ')
        }}</span>
      </div>
    </div>
  </div>
</template>
