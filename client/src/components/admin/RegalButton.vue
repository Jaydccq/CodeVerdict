<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
}>();
</script>

<template>
  <button
    :class="[
      'regal-btn',
      `regal-${variant ?? 'secondary'}`,
      `regal-${size ?? 'xs'}`,
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.regal-btn {
  @apply inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
}

/* ── Sizes ── */
.regal-xs {
  @apply px-3 py-1.5 text-xs;
}
.regal-sm {
  @apply px-4 py-2 text-sm;
}
.regal-md {
  @apply px-5 py-2.5 text-sm;
}

/* ── Variants ── */
.regal-primary {
  @apply bg-primary hover:bg-primary/90 text-white font-semibold;
}
.regal-secondary {
  @apply border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04];
}
.regal-danger {
  @apply border border-red-500/30 text-red-400 hover:bg-red-500/10;
}
.regal-accent {
  @apply border border-sky-500/30 text-sky-400 hover:bg-sky-500/10;
}
</style>
