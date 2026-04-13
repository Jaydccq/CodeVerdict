<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ code: string; title?: string }>();

const copied = ref(false);

function copyCode(code: string) {
  void navigator.clipboard.writeText(code);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <div
    class="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden"
  >
    <div
      v-if="title"
      class="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/50"
    >
      <span class="text-xs font-medium text-slate-400">{{ title }}</span>
      <button
        class="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        @click="copyCode(code)"
      >
        <span class="material-symbols-outlined text-[14px]">{{
          copied ? 'check' : 'content_copy'
        }}</span>
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <div class="relative">
      <button
        v-if="!title"
        class="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors px-2 py-1 rounded bg-slate-800/80"
        @click="copyCode(code)"
      >
        <span class="material-symbols-outlined text-[14px]">{{
          copied ? 'check' : 'content_copy'
        }}</span>
      </button>
      <pre
        class="p-4 text-sm font-mono leading-relaxed text-slate-300 overflow-x-auto"
      ><code>{{ code }}</code></pre>
    </div>
  </div>
</template>
