<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import Timer from '../shared/Timer.vue';
import { useTheme } from '../../composables/useTheme';

import { brand } from '../../config/brand';

const authStore = useAuthStore();
const uiStore = useUiStore();
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <header
    class="flex items-center h-12 px-4 bg-background-dark border-b border-white/[0.06] flex-shrink-0"
  >
    <!-- Left: Logo + Timer -->
    <div class="flex items-center gap-3">
      <img
        :src="brand.logoPath"
        :alt="brand.appName"
        class="h-7 object-contain"
      />
      <div class="w-px h-5 bg-white/10"></div>
      <div
        v-if="authStore.isAuthenticated"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-xs"
      >
        <span class="material-symbols-outlined text-primary text-[16px]"
          >timer</span
        >
        <Timer />
      </div>
    </div>

    <!-- Center: Nav Tabs -->
    <nav class="flex-1 flex items-center justify-center gap-1">
      <button
        v-for="tab in [
          { id: 'api-docs', label: 'API Docs', icon: 'menu_book' },
          { id: 'api-client', label: 'API Client', icon: 'send' },
          { id: 'code-editor', label: 'Code Editor', icon: 'code' },
        ] as const"
        :key="tab.id"
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="
          uiStore.activeTab === tab.id
            ? 'bg-primary/15 text-primary border border-primary/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
        "
        @click="uiStore.setActiveTab(tab.id)"
      >
        <span class="material-symbols-outlined text-[16px]">{{
          tab.icon
        }}</span>
        {{ tab.label }}
      </button>
    </nav>

    <!-- Right: Theme + User -->
    <div class="flex items-center gap-2">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
        :title="
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        "
        @click="toggleTheme"
      >
        <span class="material-symbols-outlined text-[18px]">{{
          theme === 'dark' ? 'light_mode' : 'dark_mode'
        }}</span>
      </button>
      <div v-if="authStore.user" class="flex items-center gap-2">
        <div
          class="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold"
        >
          {{ authStore.user.firstName?.charAt(0) || 'U' }}
        </div>
        <span class="text-xs text-slate-400 hidden lg:inline">{{
          authStore.user.firstName
        }}</span>
      </div>
    </div>
  </header>
</template>
