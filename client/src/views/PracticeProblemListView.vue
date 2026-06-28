<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { brand } from '../config/brand';
import { usePracticeStore } from '../stores/practice';

const practiceStore = usePracticeStore();

onMounted(() => {
  void practiceStore.fetchProblems();
});
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(228,37,69,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] px-6 py-8 text-slate-900"
  >
    <div class="mx-auto max-w-6xl">
      <div class="mb-10 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <img
            :src="brand.logoPath"
            :alt="brand.appName"
            class="h-12 w-12 rounded-2xl border border-black/10 bg-white object-cover p-1"
          />
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400"
            >
              private practice
            </p>
            <h1 class="text-3xl font-semibold">{{ brand.appName }}</h1>
          </div>
        </div>
        <div
          class="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm"
        >
          stdin / stdout · local judge
        </div>
      </div>

      <div
        class="mb-10 grid gap-6 rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-[1.2fr_0.8fr]"
      >
        <div>
          <p
            class="text-sm font-semibold uppercase tracking-[0.26em] text-slate-400"
          >
            Focused flow
          </p>
          <h2
            class="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-slate-950"
          >
            A stripped-down LeetCode-style workspace for your own OA problem
            set.
          </h2>
          <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Problems come from repository files. You can switch languages, run
            visible tests, try custom stdin, and submit against hidden tests
            without the exam and admin layers getting in the way.
          </p>
        </div>

        <div class="rounded-[28px] bg-slate-950 p-6 text-slate-100">
          <p
            class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
          >
            current catalog
          </p>
          <p class="mt-3 text-4xl font-semibold">
            {{ practiceStore.problems.length }}
          </p>
          <p class="mt-2 text-sm text-slate-400">validated local problems</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RouterLink
          v-for="problem in practiceStore.problems"
          :key="problem.slug"
          :to="`/problems/${problem.slug}`"
          class="group rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-slate-300"
        >
          <div class="flex items-center justify-between gap-3">
            <span
              class="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white"
            >
              {{ problem.difficulty }}
            </span>
            <span class="text-xs text-slate-400">
              {{
                problem.supportedLanguages.map((lang) => lang.label).join(' · ')
              }}
            </span>
          </div>

          <h3
            class="mt-6 text-2xl font-semibold text-slate-950 transition group-hover:text-slate-700"
          >
            {{ problem.title }}
          </h3>
          <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {{ problem.summary }}
          </p>

          <div
            class="mt-6 flex items-center justify-between text-sm font-semibold text-slate-500"
          >
            <span>{{ problem.slug }}</span>
            <span class="text-slate-900">Open</span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
