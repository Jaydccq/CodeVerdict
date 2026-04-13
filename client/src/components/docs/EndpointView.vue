<script setup lang="ts">
import type { ApiEndpoint } from '../../data/api-docs';
import CodeBlock from './CodeBlock.vue';

defineProps<{ endpoint: ApiEndpoint }>();

const methodBadge: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  POST: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PUT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
};
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-8 max-w-6xl">
    <!-- Left: Content -->
    <div class="flex-1 min-w-0">
      <!-- Title + Method badge -->
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {{ endpoint.title }}
      </h1>

      <div class="flex items-center gap-3 mb-6">
        <span
          class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase border"
          :class="methodBadge[endpoint.method]"
        >
          {{ endpoint.method }}
        </span>
        <code
          class="text-sm font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded"
        >
          {{ endpoint.path }}
        </code>
      </div>

      <p
        class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6"
      >
        {{ endpoint.description }}
      </p>

      <!-- Auth requirement -->
      <div
        v-if="endpoint.auth"
        class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10"
      >
        <span class="material-symbols-outlined text-blue-400 text-[16px]"
          >lock</span
        >
        <span class="text-xs text-blue-400">{{ endpoint.auth }}</span>
      </div>

      <!-- Rate limit -->
      <div
        v-if="endpoint.rateLimit"
        class="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10"
      >
        <span class="material-symbols-outlined text-yellow-400 text-[16px]"
          >speed</span
        >
        <span class="text-xs text-yellow-400">{{ endpoint.rateLimit }}</span>
      </div>

      <!-- Path Params -->
      <div v-if="endpoint.pathParams?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Path Parameters
        </h3>
        <div
          class="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/[0.02]">
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Name
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Type
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in endpoint.pathParams"
                :key="p.name"
                class="border-t border-slate-200 dark:border-white/[0.04]"
              >
                <td class="px-4 py-2.5">
                  <code class="text-xs font-mono text-primary">{{
                    p.name
                  }}</code>
                  <span v-if="p.required" class="text-primary text-[10px] ml-1"
                    >*</span
                  >
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{{ p.type }}</td>
                <td
                  class="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  {{ p.description }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Query Params -->
      <div v-if="endpoint.queryParams?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Query Parameters
        </h3>
        <div
          class="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/[0.02]">
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Name
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Type
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in endpoint.queryParams"
                :key="p.name"
                class="border-t border-slate-200 dark:border-white/[0.04]"
              >
                <td class="px-4 py-2.5">
                  <code class="text-xs font-mono text-primary">{{
                    p.name
                  }}</code>
                  <span v-if="p.required" class="text-primary text-[10px] ml-1"
                    >*</span
                  >
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{{ p.type }}</td>
                <td
                  class="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  {{ p.description }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Banner -->
      <div
        v-if="endpoint.banner"
        class="mb-6 px-5 py-4 rounded-xl border"
        :class="{
          'bg-purple-500/5 border-purple-500/20':
            endpoint.banner.color === 'purple',
          'bg-emerald-500/5 border-emerald-500/20':
            endpoint.banner.color === 'green',
          'bg-blue-500/5 border-blue-500/20': endpoint.banner.color === 'blue',
        }"
      >
        <div class="flex items-start gap-3">
          <span
            class="material-symbols-outlined text-[22px] mt-0.5 flex-shrink-0"
            :class="{
              'text-purple-400': endpoint.banner.color === 'purple',
              'text-emerald-400': endpoint.banner.color === 'green',
              'text-blue-400': endpoint.banner.color === 'blue',
            }"
          >
            {{ endpoint.banner.icon }}
          </span>
          <div>
            <h4
              class="text-sm font-bold mb-1"
              :class="{
                'text-purple-400': endpoint.banner.color === 'purple',
                'text-emerald-400': endpoint.banner.color === 'green',
                'text-blue-400': endpoint.banner.color === 'blue',
              }"
            >
              {{ endpoint.banner.title }}
            </h4>
            <p
              class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
            >
              {{ endpoint.banner.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Request Body -->
      <div v-if="endpoint.requestBody?.length" class="mb-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Request Body
        </h3>
        <div
          class="border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-white/[0.02]">
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Field
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Type
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Required
                </th>
                <th
                  class="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in endpoint.requestBody"
                :key="p.name"
                class="border-t border-slate-200 dark:border-white/[0.04]"
              >
                <td class="px-4 py-2.5">
                  <code class="text-xs font-mono text-primary">{{
                    p.name
                  }}</code>
                </td>
                <td class="px-4 py-2.5 text-xs text-slate-500">{{ p.type }}</td>
                <td class="px-4 py-2.5">
                  <span v-if="p.required" class="text-emerald-400 text-xs"
                    >Yes</span
                  >
                  <span v-else class="text-slate-500 text-xs">No</span>
                </td>
                <td
                  class="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  {{ p.description }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Response -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Response
        </h3>
        <CodeBlock :code="endpoint.responseExample" title="200 OK" />
      </div>

      <!-- Notes -->
      <div v-if="endpoint.notes?.length" class="mb-6">
        <div class="px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-primary text-[16px]"
              >info</span
            >
            <span class="text-xs font-semibold text-primary">Notes</span>
          </div>
          <ul class="space-y-1">
            <li
              v-for="(note, i) in endpoint.notes"
              :key="i"
              class="text-xs text-slate-600 dark:text-slate-400 flex gap-2"
            >
              <span class="text-primary">•</span>
              {{ note }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Right: Code Example (sticky) -->
    <div class="lg:w-[380px] flex-shrink-0">
      <div class="lg:sticky lg:top-6">
        <CodeBlock
          v-if="endpoint.requestExample"
          :code="endpoint.requestExample"
          title="Request Example"
        />
      </div>
    </div>
  </div>
</template>
