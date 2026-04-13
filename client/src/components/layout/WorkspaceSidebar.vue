<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import type { ActiveTab } from '../../stores/ui';

const uiStore = useUiStore();

const tabs: {
  id: ActiveTab;
  icon: string;
  label: string;
  coachmark: string;
}[] = [
  {
    id: 'api-docs',
    icon: 'menu_book',
    label: 'API Docs',
    coachmark:
      'Browse the exam API reference - endpoints, parameters, and response shapes.',
  },
  {
    id: 'api-client',
    icon: 'send',
    label: 'API Client',
    coachmark:
      'Make live API requests directly from the browser. Test your integration here.',
  },
  {
    id: 'code-editor',
    icon: 'code',
    label: 'Code Editor',
    coachmark:
      'Write, run, and submit your solution. Pick a problem from the sidebar.',
  },
];
</script>

<template>
  <aside class="workspace-rail">
    <div class="flex flex-col items-center gap-0.5 pt-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :data-tour="'sidebar-' + tab.id"
        class="rail-tab group"
        :class="
          uiStore.activeTab === tab.id ? 'rail-tab--active' : 'rail-tab--idle'
        "
        @click="uiStore.setActiveTab(tab.id)"
      >
        <!-- Active indicator -->
        <span
          class="rail-indicator"
          :class="uiStore.activeTab === tab.id ? 'opacity-100' : 'opacity-0'"
        />

        <span
          class="material-symbols-outlined text-[20px] transition-transform duration-150"
          :class="
            uiStore.activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
          "
          >{{ tab.icon }}</span
        >

        <!-- Tooltip -->
        <div class="rail-tooltip">{{ tab.label }}</div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.workspace-rail {
  @apply flex flex-col items-center w-[52px]
         bg-slate-50 dark:bg-[#0d1117]
         border-r border-slate-200 dark:border-white/[0.06] flex-shrink-0;
}

.rail-tab {
  @apply relative flex items-center justify-center
         w-[40px] h-[40px] rounded-lg transition-all cursor-pointer;
}

.rail-tab--active {
  @apply bg-primary/10 text-primary;
}

.rail-tab--idle {
  @apply text-slate-400 dark:text-slate-500
         hover:text-slate-700 dark:hover:text-slate-300
         hover:bg-slate-100 dark:hover:bg-white/[0.04];
}

.rail-indicator {
  @apply absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full
         bg-primary transition-opacity duration-200;
}

.rail-tooltip {
  @apply absolute left-full ml-2 px-2.5 py-1 rounded-md
         bg-slate-800 dark:bg-slate-700 border border-slate-700 dark:border-white/[0.08]
         text-white text-[11px] font-medium whitespace-nowrap
         pointer-events-none z-50 opacity-0 group-hover:opacity-100
         transition-opacity duration-150;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
</style>
