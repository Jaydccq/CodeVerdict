<script setup lang="ts">
import { useUiStore } from '../../stores/ui';

const uiStore = useUiStore();

const tabs = [
  {
    icon: 'menu_book',
    label: 'API Docs',
    description:
      'Browse the full exam API reference - endpoints, request formats, response shapes, and authentication details.',
  },
  {
    icon: 'send',
    label: 'API Client',
    description:
      'Make live API requests directly from the browser. Build and test your integration interactively without leaving the page.',
  },
  {
    icon: 'code',
    label: 'Code Editor',
    description:
      'Write, run, and submit your solution. Pick a problem from the left sidebar, code it up in your language of choice, and hit Submit.',
  },
];

function close() {
  uiStore.closeHelpModal();
}

function closeAndDismiss() {
  uiStore.dismissCoachmarks();
  uiStore.closeHelpModal();
}

function startTour() {
  uiStore.closeHelpModal();
  void import('../../composables/useTour').then(({ startTour: launchTour }) => {
    void launchTour();
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] w-full max-w-md mx-4"
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]"
        >
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]"
              >help</span
            >
            <h2 class="text-base font-semibold text-slate-900 dark:text-white">
              Workspace Guide
            </h2>
          </div>
          <button
            class="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            @click="close"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div v-for="tab in tabs" :key="tab.label" class="flex gap-3">
            <div
              class="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <span
                class="material-symbols-outlined text-primary text-[18px]"
                >{{ tab.icon }}</span
              >
            </div>
            <div>
              <p
                class="text-sm font-semibold text-slate-900 dark:text-white mb-0.5"
              >
                {{ tab.label }}
              </p>
              <p
                class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
              >
                {{ tab.description }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between"
        >
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-white transition-colors"
            @click="startTour"
          >
            <span class="material-symbols-outlined text-[16px]">tour</span>
            Show tour
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95"
            @click="closeAndDismiss"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
