<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
  }>(),
  {
    confirmLabel: 'Confirm',
    danger: false,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
      @click.self="emit('cancel')"
    >
      <div
        class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 w-[calc(100vw-2rem)] max-w-[480px] shadow-2xl"
        role="dialog"
        :aria-label="title"
      >
        <h3 class="text-base font-bold text-slate-900 dark:text-white mb-2.5">
          {{ title }}
        </h3>
        <p
          class="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed"
        >
          {{ message }}
        </p>
        <div class="flex justify-end gap-2.5">
          <button
            class="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            :class="
              danger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-white'
            "
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
