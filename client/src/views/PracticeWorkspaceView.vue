<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { brand } from '../config/brand';
import PracticeCodeEditor from '../components/practice/PracticeCodeEditor.vue';
import PracticeResultPanel from '../components/practice/PracticeResultPanel.vue';
import { usePracticeStore } from '../stores/practice';

const route = useRoute();
const practiceStore = usePracticeStore();

const currentSlug = computed(() => route.params.slug as string);

async function loadCurrentProblem() {
  await practiceStore.fetchProblems();
  await practiceStore.openProblem(currentSlug.value);
}

onMounted(() => {
  void loadCurrentProblem();
});

watch(currentSlug, () => {
  void loadCurrentProblem();
});
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_42%,#f8fafc_100%)]"
  >
    <header class="border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur">
      <div
        class="mx-auto flex max-w-[1600px] items-center justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <RouterLink
            to="/"
            class="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Problems
          </RouterLink>
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
            >
              {{ brand.appName }}
            </p>
            <h1 class="text-2xl font-semibold text-slate-950">
              {{ practiceStore.currentProblem?.title ?? 'Loading problem...' }}
            </h1>
          </div>
        </div>

        <div
          class="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-slate-500"
        >
          {{ practiceStore.currentProblem?.difficulty ?? '' }}
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-6">
      <div
        v-if="practiceStore.loadingProblem"
        class="flex min-h-[320px] flex-1 items-center justify-center rounded-[32px] border border-black/10 bg-white text-slate-500"
      >
        Loading problem...
      </div>

      <template v-else-if="practiceStore.currentProblem">
        <div class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <section
            class="min-h-0 overflow-y-auto rounded-[32px] border border-black/10 bg-white/85 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]"
          >
            <p
              class="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400"
            >
              Problem
            </p>
            <h2 class="mt-4 text-3xl font-semibold text-slate-950">
              {{ practiceStore.currentProblem.title }}
            </h2>
            <p
              class="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700"
            >
              {{ practiceStore.currentProblem.description }}
            </p>

            <div class="mt-8 grid gap-6 lg:grid-cols-2">
              <div class="rounded-3xl bg-slate-50 p-5">
                <h3 class="text-sm font-semibold text-slate-950">
                  Input Format
                </h3>
                <p
                  class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600"
                >
                  {{ practiceStore.currentProblem.inputFormat }}
                </p>
              </div>
              <div class="rounded-3xl bg-slate-50 p-5">
                <h3 class="text-sm font-semibold text-slate-950">
                  Output Format
                </h3>
                <p
                  class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600"
                >
                  {{ practiceStore.currentProblem.outputFormat }}
                </p>
              </div>
            </div>

            <div class="mt-8 rounded-3xl bg-slate-50 p-5">
              <h3 class="text-sm font-semibold text-slate-950">Constraints</h3>
              <p
                class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600"
              >
                {{ practiceStore.currentProblem.constraints }}
              </p>
            </div>

            <div class="mt-8 space-y-4">
              <div
                v-for="(sample, index) in practiceStore.currentProblem.samples"
                :key="`${practiceStore.currentProblem.slug}-${index}`"
                class="rounded-3xl border border-black/10 bg-slate-50 p-5"
              >
                <h3 class="text-sm font-semibold text-slate-950">
                  Example {{ index + 1 }}
                </h3>
                <div class="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p
                      class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400"
                    >
                      Input
                    </p>
                    <pre
                      class="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-4 font-mono text-xs text-slate-700"
                      >{{ sample.input }}</pre
                    >
                  </div>
                  <div>
                    <p
                      class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400"
                    >
                      Output
                    </p>
                    <pre
                      class="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-4 font-mono text-xs text-slate-700"
                      >{{ sample.output }}</pre
                    >
                  </div>
                </div>
                <p
                  v-if="sample.explanation"
                  class="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600"
                >
                  {{ sample.explanation }}
                </p>
              </div>
            </div>
          </section>

          <div class="grid min-h-0 grid-rows-[minmax(0,1fr)] xl:sticky xl:top-6 xl:self-start">
            <PracticeCodeEditor />
          </div>
        </div>

        <div class="h-[34vh] min-h-[240px]">
          <PracticeResultPanel />
        </div>
      </template>

      <div
        v-else
        class="flex min-h-[320px] flex-1 items-center justify-center rounded-[32px] border border-black/10 bg-white text-slate-500"
      >
        {{ practiceStore.error || 'Problem not found.' }}
      </div>
    </main>
  </div>
</template>
