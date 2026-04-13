<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  page: number;
  total: number;
  limit: number;
}>();

const emit = defineEmits<{ 'update:page': [page: number] }>();

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.limit)),
);
const from = computed(() =>
  props.total === 0 ? 0 : (props.page - 1) * props.limit + 1,
);
const to = computed(() => Math.min(props.page * props.limit, props.total));

function goTo(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return;
  emit('update:page', p);
}

const pageNumbers = computed<(number | '...')[]>(() => {
  const t = totalPages.value;
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  const cur = props.page;
  const result: (number | '...')[] = [1];
  if (cur > 3) result.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(t - 1, cur + 1); i++)
    result.push(i);
  if (cur < t - 2) result.push('...');
  result.push(t);
  return result;
});
</script>

<template>
  <div
    v-if="total > 0"
    class="flex items-center justify-between px-1 py-3 mt-1"
  >
    <span class="text-xs text-slate-400">
      Showing {{ from }}–{{ to }} of {{ total }}
    </span>
    <div class="flex items-center gap-1">
      <button
        class="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
        :disabled="page <= 1"
        @click="goTo(page - 1)"
      >
        ←
      </button>
      <template v-for="(p, i) in pageNumbers" :key="i">
        <span v-if="p === '...'" class="px-1 text-xs text-slate-500">…</span>
        <button
          v-else
          class="min-w-[30px] px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors"
          :class="
            p === page
              ? 'bg-primary border-primary text-white'
              : 'border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
          "
          @click="goTo(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        class="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
        :disabled="page >= totalPages"
        @click="goTo(page + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>
