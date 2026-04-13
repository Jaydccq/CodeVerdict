<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';
import { useRoute, useRouter } from 'vue-router';
import {
  listAllProblems,
  getTestCase,
  createTestCase,
  updateTestCase,
} from '../../services/adminApi';
import type {
  CreateTestCasePayload,
  UpdateTestCasePayload,
} from '../../types/admin';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const errorRaw = ref('');

interface ProblemOption {
  id: number;
  title: string;
  exam?: { id: number; title: string };
}

const problems = ref<ProblemOption[]>([]);

const problemOptions = computed<SelectOption[]>(() =>
  problems.value.map((p) => ({
    value: p.id,
    label: p.exam?.title ? `[${p.exam.title}] ${p.title}` : p.title,
  })),
);
const readonlyInfo = ref({ problem: '', exam: '' });

const form = ref({
  problemId: '' as number | '',
  input: '',
  expectedOutput: '',
  isVisible: false,
  displayOrder: 0,
});

onMounted(async () => {
  loading.value = true;
  try {
    if (isEdit.value) {
      const tc = await getTestCase(Number(route.params.id));
      if (!tc) throw new Error('Test case not found');
      form.value = {
        problemId: tc.problemId ?? '',
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        isVisible: tc.isVisible ?? false,
        displayOrder: tc.displayOrder ?? 0,
      };
      readonlyInfo.value = {
        problem: tc.problem?.title ?? '-',
        exam: tc.problem?.exam?.title ?? '-',
      };
    } else {
      problems.value = (await listAllProblems(undefined, { limit: 100 })).data;
    }
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to load data.';
    errorRaw.value = e.raw;
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  error.value = '';
  errorRaw.value = '';
  try {
    if (isEdit.value) {
      await updateTestCase(Number(route.params.id), {
        input: form.value.input,
        expectedOutput: form.value.expectedOutput,
        isVisible: form.value.isVisible,
        displayOrder: form.value.displayOrder,
      } as UpdateTestCasePayload);
    } else {
      await createTestCase({
        problemId: form.value.problemId,
        input: form.value.input,
        expectedOutput: form.value.expectedOutput,
        isVisible: form.value.isVisible,
        displayOrder: form.value.displayOrder,
      } as CreateTestCasePayload);
    }
    void router.push({ name: 'admin-testcases' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = isEdit.value
      ? 'Failed to update test case.'
      : 'Failed to create test case.';
    errorRaw.value = e.raw;
  } finally {
    saving.value = false;
  }
}

function extractError(err: unknown): { message: string; raw: string } {
  const ax = err as {
    response?: { status?: number; statusText?: string; data?: unknown };
    message?: string;
  };
  if (ax.response) {
    const respData = ax.response.data as { message?: string } | undefined;
    return {
      message: respData?.message ?? ax.response.statusText ?? 'Error',
      raw: `${ax.response.status} ${ax.response.statusText}: ${JSON.stringify(ax.response.data, null, 2)}`,
    };
  }
  return {
    message: ax.message ?? 'Unknown error',
    raw: ax.message ?? 'Unknown error',
  };
}
</script>

<template>
  <div class="max-w-[700px]">
    <div class="flex items-center gap-3 mb-6">
      <RegalButton @click="router.push({ name: 'admin-testcases' })"
        >← Back</RegalButton
      >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit Test Case' : 'Create Test Case' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="save">
      <div
        v-if="isEdit"
        class="flex gap-6 px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
      >
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Problem</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            readonlyInfo.problem
          }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Exam</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            readonlyInfo.exam
          }}</span>
        </div>
      </div>

      <div v-if="!isEdit" class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Problem <span class="text-primary ml-0.5">*</span></label
        >
        <RegalSelect
          v-model="form.problemId"
          :options="problemOptions"
          placeholder="Select problem…"
          searchable
          required
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Input <span class="text-primary ml-0.5">*</span></label
        >
        <textarea
          v-model="form.input"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors resize-y min-h-[100px] font-mono"
          rows="6"
          required
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Expected Output <span class="text-primary ml-0.5">*</span></label
        >
        <textarea
          v-model="form.expectedOutput"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors resize-y min-h-[100px] font-mono"
          rows="6"
          required
        ></textarea>
      </div>

      <div class="flex flex-col sm:flex-row gap-3.5">
        <div class="flex-1 flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Display Order</label
          >
          <input
            v-model.number="form.displayOrder"
            type="number"
            min="0"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Visible to Students</label
          >
          <div class="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              role="switch"
              :aria-checked="form.isVisible"
              class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
              :class="form.isVisible ? 'bg-primary' : 'bg-slate-600'"
              @click="form.isVisible = !form.isVisible"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="form.isVisible ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
            <span class="text-sm text-slate-500">{{
              form.isVisible ? 'Yes' : 'No'
            }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg"
      >
        <div class="font-medium">{{ error }}</div>
        <pre
          v-if="errorRaw"
          class="mt-2 font-mono text-xs text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap break-all"
          >{{ errorRaw }}</pre
        >
      </div>

      <div class="flex gap-2.5 pt-2">
        <RegalButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="saving"
        >
          {{
            saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Test Case'
          }}
        </RegalButton>
        <RegalButton
          type="button"
          @click="router.push({ name: 'admin-testcases' })"
          >Cancel</RegalButton
        >
      </div>
    </form>
  </div>
</template>
