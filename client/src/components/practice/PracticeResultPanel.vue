<script setup lang="ts">
import { computed } from 'vue';
import { usePracticeStore } from '../../stores/practice';

const practiceStore = usePracticeStore();

const history = computed(() => practiceStore.submissions);

function verdictLabel(verdict: string): string {
  return verdict
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
  >
    <div
      class="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <button
          class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
          :class="
            practiceStore.activeBottomTab === 'results'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-white text-slate-600'
          "
          @click="practiceStore.activeBottomTab = 'results'"
        >
          测试结果
        </button>
        <button
          class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
          :class="
            practiceStore.activeBottomTab === 'history'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-white text-slate-600'
          "
          @click="practiceStore.activeBottomTab = 'history'"
        >
          提交记录
        </button>
      </div>
      <span
        class="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400"
      >
        local practice
      </span>
    </div>

    <div
      v-if="practiceStore.activeBottomTab === 'results'"
      class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <div class="space-y-4">
        <div class="rounded-2xl border border-black/10 bg-slate-50 p-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-900">自定义输入</h3>
            <button
              class="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              :disabled="practiceStore.runningCustom"
              @click="practiceStore.runCustom"
            >
              {{ practiceStore.runningCustom ? '运行中...' : '运行自定义输入' }}
            </button>
          </div>
          <textarea
            v-model="practiceStore.customInput"
            class="h-48 w-full rounded-2xl border border-black/10 bg-white p-3 font-mono text-sm text-slate-700 outline-none"
            placeholder="在这里粘贴自定义 stdin"
          />
        </div>

        <div
          v-if="practiceStore.error"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {{ practiceStore.error }}
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-if="practiceStore.lastSubmission"
          class="rounded-2xl border border-black/10 bg-slate-50 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
              >
                最近一次提交
              </p>
              <h3 class="mt-2 text-lg font-semibold text-slate-900">
                {{ verdictLabel(practiceStore.lastSubmission.verdict) }}
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                通过 {{ practiceStore.lastSubmission.passedCount }} /
                {{ practiceStore.lastSubmission.totalCount }} tests
              </p>
            </div>
            <span
              class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {{
                new Date(
                  practiceStore.lastSubmission.createdAt,
                ).toLocaleString()
              }}
            </span>
          </div>

          <div
            v-if="practiceStore.lastSubmission.visibleFailure"
            class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p class="font-semibold">样例测试失败</p>
            <pre
              class="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-mono text-xs"
            >
输入:
{{ practiceStore.lastSubmission.visibleFailure.input }}

期望输出:
{{ practiceStore.lastSubmission.visibleFailure.expectedOutput }}

实际输出:
{{ practiceStore.lastSubmission.visibleFailure.actualOutput ?? '' }}</pre
            >
          </div>

          <div
            v-if="practiceStore.lastSubmission.hiddenFailure"
            class="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
          >
            未通过隐藏测试。类型:
            {{
              verdictLabel(
                practiceStore.lastSubmission.hiddenFailure.failureType ??
                  'unknown',
              )
            }}
          </div>
        </div>

        <div
          v-if="practiceStore.customRun"
          class="rounded-2xl border border-black/10 bg-slate-50 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-900">
            自定义运行输出
          </h3>
          <pre
            class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100"
            >{{
              practiceStore.customRun.stdout ||
              practiceStore.customRun.stderr ||
              practiceStore.customRun.compileOutput ||
              '(no output)'
            }}</pre
          >
        </div>

        <div v-if="practiceStore.sampleRun" class="space-y-3">
          <div
            v-for="result in practiceStore.sampleRun.results"
            :key="result.index"
            class="rounded-2xl border border-black/10 bg-slate-50 p-4"
          >
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-sm font-semibold text-slate-900">
                样例测试 {{ result.index + 1 }}
              </h3>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="
                  result.passed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                "
              >
                {{ verdictLabel(result.status) }}
              </span>
            </div>
            <pre
              class="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-3 font-mono text-xs text-slate-700"
            >
输入:
{{ result.input }}

期望输出:
{{ result.expectedOutput }}

实际输出:
{{ result.actualOutput ?? '' }}</pre
            >
            <p
              v-if="result.stderr || result.compileOutput"
              class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-3 font-mono text-xs text-amber-200"
            >
              {{ result.stderr || result.compileOutput }}
            </p>
          </div>
        </div>

        <div
          v-if="
            !practiceStore.lastSubmission &&
            !practiceStore.customRun &&
            !practiceStore.sampleRun
          "
          class="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-slate-50 text-sm text-slate-500"
        >
          运行样例、自定义输入，或者提交代码后，会在这里看到结果。
        </div>
      </div>
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto p-4">
      <div
        v-if="history.length === 0"
        class="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-slate-50 text-sm text-slate-500"
      >
        还没有提交记录。
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="submission in history"
          :key="submission.id"
          class="rounded-2xl border border-black/10 bg-slate-50 p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">
                {{ verdictLabel(submission.verdict) }}
              </p>
              <p class="text-xs text-slate-500">
                {{ submission.language }} · {{ submission.passedCount }} /
                {{ submission.totalCount }} 通过
              </p>
            </div>
            <span class="text-xs text-slate-400">
              {{ new Date(submission.createdAt).toLocaleString() }}
            </span>
          </div>

          <pre
            v-if="submission.safeDetailsJson"
            class="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-3 font-mono text-xs text-slate-700"
            >{{ JSON.stringify(submission.safeDetailsJson, null, 2) }}</pre
          >
        </div>
      </div>
    </div>
  </div>
</template>
