<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { brand } from '../config/brand';
import PracticeCodeEditor from '../components/practice/PracticeCodeEditor.vue';
import PracticeResultPanel from '../components/practice/PracticeResultPanel.vue';
import { usePracticeStore } from '../stores/practice';

const route = useRoute();
const practiceStore = usePracticeStore();
const activeReadingTab = ref<'statement' | 'solution'>('statement');
const editorialDraft = ref('');
const editorialSavedValue = ref('');

const currentSlug = computed(() => route.params.slug as string);
const editorialBody = computed(() => {
  return editorialDraft.value.replace(/^# .*(\n+|$)/, '').trim();
});
const editorialBlocks = computed(() => {
  return editorialBody.value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
});
const hasEditorialChanges = computed(
  () => editorialDraft.value !== editorialSavedValue.value,
);

async function loadCurrentProblem() {
  await practiceStore.fetchProblems();
  await practiceStore.openProblem(currentSlug.value);
}

async function saveEditorial() {
  try {
    await practiceStore.saveEditorial(editorialDraft.value);
    editorialDraft.value = practiceStore.currentProblem?.editorial ?? '';
    editorialSavedValue.value = editorialDraft.value;
  } catch {
    // The store already exposes the failure through practiceStore.error.
  }
}

onMounted(() => {
  void loadCurrentProblem();
});

watch(currentSlug, () => {
  activeReadingTab.value = 'statement';
  void loadCurrentProblem();
});

watch(
  () => practiceStore.currentProblem?.slug,
  () => {
    editorialDraft.value = practiceStore.currentProblem?.editorial ?? '';
    editorialSavedValue.value = editorialDraft.value;
  },
  { immediate: true },
);
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
            <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <h2 class="text-3xl font-semibold text-slate-950">
                {{ practiceStore.currentProblem.title }}
              </h2>
              <div
                class="grid w-full grid-cols-2 rounded-2xl border border-black/10 bg-slate-100 p-1 text-sm font-semibold text-slate-600 lg:w-auto"
              >
                <button
                  class="rounded-xl px-4 py-2 transition"
                  :class="
                    activeReadingTab === 'statement'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'hover:text-slate-950'
                  "
                  @click="activeReadingTab = 'statement'"
                >
                  题目
                </button>
                <button
                  class="rounded-xl px-4 py-2 transition"
                  :class="
                    activeReadingTab === 'solution'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'hover:text-slate-950'
                  "
                  @click="activeReadingTab = 'solution'"
                >
                  答案解析
                </button>
              </div>
            </div>

            <template v-if="activeReadingTab === 'statement'">
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
            </template>

            <section v-else class="mt-8 space-y-5">
              <div
                class="overflow-hidden rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,#f8fafc)]"
              >
                <div class="border-b border-emerald-200/80 px-5 py-4">
                  <p
                    class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700"
                  >
                    Answer Notes
                  </p>
                  <h3 class="mt-2 text-xl font-semibold text-emerald-950">
                    答案与解析
                  </h3>
                </div>
                <div class="grid gap-4 p-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm text-slate-600">
                      {{
                        hasEditorialChanges
                          ? '解析有未保存改动'
                          : '解析内容已与 editorial.md 同步'
                      }}
                    </p>
                    <button
                      class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      :disabled="practiceStore.savingEditorial || !hasEditorialChanges"
                      @click="saveEditorial"
                    >
                      {{
                        practiceStore.savingEditorial ? '保存中...' : '保存解析'
                      }}
                    </button>
                  </div>

                  <label class="grid gap-3">
                    <span class="text-sm font-semibold text-emerald-950">
                      编辑解析
                    </span>
                    <textarea
                      v-model="editorialDraft"
                      class="min-h-[220px] rounded-2xl border border-emerald-200 bg-white px-4 py-3 font-mono text-sm leading-7 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                      placeholder="在这里输入答案、思路、复杂度分析、边界条件说明。"
                      spellcheck="false"
                    />
                  </label>

                  <div
                    v-if="editorialBlocks.length === 0"
                    class="rounded-2xl border border-dashed border-emerald-300 bg-white/70 px-4 py-6 text-sm text-slate-500"
                  >
                    解析预览会显示在这里。
                  </div>
                  <article
                    v-for="(block, index) in editorialBlocks"
                    :key="`${practiceStore.currentProblem.slug}-editorial-${index}`"
                    class="rounded-2xl border border-emerald-200/70 bg-white/85 p-4 shadow-sm"
                  >
                    <div class="mb-3 flex items-center gap-3">
                      <span
                        class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800"
                      >
                        {{ index + 1 }}
                      </span>
                      <p class="text-sm font-semibold text-emerald-950">
                        {{ index === 0 ? '核心思路' : '解析补充' }}
                      </p>
                    </div>
                    <p class="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {{ block }}
                    </p>
                  </article>
                </div>
              </div>
            </section>
          </section>

          <div
            class="grid h-[min(760px,calc(100vh-9rem))] min-h-[520px] min-w-0 grid-rows-[minmax(0,1fr)] xl:sticky xl:top-6 xl:self-start"
          >
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
