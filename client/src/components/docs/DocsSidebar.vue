<script setup lang="ts">
import { ref } from 'vue';
import { apiGroups } from '../../data/api-docs';
import { brand } from '../../config/brand';

defineProps<{ activeEndpointId: string }>();
const emit = defineEmits<{ (e: 'select', id: string): void }>();

const expandedGroups = ref<Set<string>>(new Set(apiGroups.map((g) => g.id)));

function toggleGroup(id: string) {
  if (expandedGroups.value.has(id)) {
    expandedGroups.value.delete(id);
  } else {
    expandedGroups.value.add(id);
  }
}

const methodColors: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-red-400',
};
</script>

<template>
  <aside
    class="flex flex-col h-full w-[272px] border-r border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-background-dark overflow-y-auto flex-shrink-0"
  >
    <!-- Header -->
    <div class="px-4 pt-5 pb-3">
      <h2
        class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-primary text-[18px]"
          >menu_book</span
        >
        API Reference
      </h2>
    </div>

    <!-- Introduction link -->
    <button
      class="mx-3 mb-2 px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors"
      :class="
        activeEndpointId === 'intro'
          ? 'bg-primary/10 text-primary'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
      "
      @click="emit('select', 'intro')"
    >
      Introduction
    </button>

    <!-- Endpoint Groups -->
    <nav class="flex-1 px-3 pb-4">
      <div v-for="group in apiGroups" :key="group.id" class="mb-1">
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          @click="toggleGroup(group.id)"
        >
          <span class="material-symbols-outlined text-[16px]">{{
            expandedGroups.has(group.id) ? 'expand_more' : 'chevron_right'
          }}</span>
          {{ group.title }}
        </button>

        <div v-if="expandedGroups.has(group.id)" class="ml-2 space-y-0.5">
          <button
            v-for="endpoint in group.endpoints"
            :key="endpoint.id"
            class="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg transition-colors"
            :class="
              activeEndpointId === endpoint.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            "
            @click="emit('select', endpoint.id)"
          >
            <span
              class="font-mono text-[10px] font-bold w-8 text-right"
              :class="methodColors[endpoint.method]"
            >
              {{ endpoint.method }}
            </span>
            <span class="truncate">{{ endpoint.title }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div
      class="px-4 py-3 border-t border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-400"
    >
      {{ brand.apiTitle }} {{ brand.apiVersion }}
    </div>
  </aside>
</template>
