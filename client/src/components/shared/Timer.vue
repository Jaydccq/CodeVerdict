<script setup lang="ts">
import { inject, type Ref } from 'vue';

const { remaining, isWarning, isCritical, isExpired } = inject(
  'timerState',
) as {
  remaining: Ref<string>;
  isWarning: Ref<boolean>;
  isCritical: Ref<boolean>;
  isExpired: Ref<boolean>;
};
</script>

<template>
  <div
    class="timer-chip"
    :class="{
      'timer-normal': !isWarning && !isCritical && !isExpired,
      'timer-warning': isWarning && !isCritical,
      'timer-critical': isCritical && !isExpired,
      'timer-expired': isExpired,
    }"
  >
    <span
      class="material-symbols-outlined timer-icon"
      :class="{ 'animate-pulse': isCritical && !isExpired }"
      >{{ isExpired ? 'timer_off' : 'timer' }}</span
    >
    <span
      class="timer-text"
      :class="{ 'animate-pulse': isCritical && !isExpired }"
      >{{ remaining }}</span
    >
  </div>
</template>

<style scoped>
.timer-chip {
  @apply flex items-center gap-1.5
         px-3 py-1.5 rounded-lg
         border transition-all duration-500
         select-none;
}

.timer-icon {
  @apply text-[16px] flex-shrink-0 transition-colors duration-500;
}

.timer-text {
  @apply font-mono text-sm font-bold tracking-widest transition-colors duration-500;
}

/* Normal: slate */
.timer-normal {
  @apply bg-slate-100 dark:bg-white/[0.05]
         border-slate-200 dark:border-white/[0.08]
         text-slate-600 dark:text-slate-300;
}

/* Warning: amber < 15 min */
.timer-warning {
  @apply bg-amber-500/10
         border-amber-400/40
         text-amber-600 dark:text-amber-400;
}

/* Critical: red < 5 min */
.timer-critical {
  @apply bg-red-500/10
         border-red-500/50
         text-red-600 dark:text-red-400;
}

/* Expired */
.timer-expired {
  @apply bg-slate-100 dark:bg-white/[0.04]
         border-slate-200 dark:border-white/[0.06]
         text-slate-400 dark:text-slate-500;
}
</style>
