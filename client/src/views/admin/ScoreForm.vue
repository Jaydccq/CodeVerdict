<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getScore,
  createScore,
  updateScore,
  listUsers,
  listExams,
  listAllProblems,
} from '../../services/adminApi';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const errorRaw = ref('');

const users = ref<
  Array<{ id: number; rollNumber: string; firstName: string; lastName: string }>
>([]);
const exams = ref<Array<{ id: number; title: string }>>([]);
const problems = ref<Array<{ id: number; title: string; examId: number }>>([]);

const readonlyInfo = ref({ student: '', problem: '', exam: '' });

const form = ref({
  userId: '' as number | '',
  examId: '' as number | '',
  problemId: '' as number | '',
  bestScore: 0,
  totalAttempts: 0,
  wrongAttempts: 0,
  firstSolvedAt: '' as string,
});

const userOptions = computed<SelectOption[]>(() =>
  users.value.map((u) => ({
    value: u.id,
    label: `${u.rollNumber} - ${u.firstName} ${u.lastName}`,
  })),
);

const examOptions = computed<SelectOption[]>(() =>
  exams.value.map((e) => ({ value: e.id, label: e.title })),
);

const filteredProblems = computed(() => {
  if (!form.value.examId) return problems.value;
  return problems.value.filter((p) => p.examId === form.value.examId);
});

const problemOptions = computed<SelectOption[]>(() =>
  filteredProblems.value.map((p) => ({ value: p.id, label: p.title })),
);

onMounted(async () => {
  loading.value = true;
  try {
    if (isEdit.value) {
      const s = await getScore(Number(route.params.id));
      form.value = {
        userId: s.userId,
        examId: s.examId,
        problemId: s.problemId,
        bestScore: Number(s.bestScore),
        totalAttempts: s.totalAttempts,
        wrongAttempts: s.wrongAttempts,
        firstSolvedAt: s.firstSolvedAt
          ? new Date(s.firstSolvedAt).toISOString().slice(0, 16)
          : '',
      };
      readonlyInfo.value = {
        student: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''} (${s.user?.rollNumber ?? ''})`,
        problem: s.problem?.title ?? '-',
        exam: s.exam?.title ?? '-',
      };
    } else {
      const [u, e, p] = await Promise.all([
        listUsers({ limit: 100 }),
        listExams({ limit: 100 }),
        listAllProblems(undefined, { limit: 100 }),
      ]);
      users.value = u.data;
      exams.value = e.data;
      problems.value = p.data as typeof problems.value;
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
      await updateScore(Number(route.params.id), {
        bestScore: form.value.bestScore,
        totalAttempts: form.value.totalAttempts,
        wrongAttempts: form.value.wrongAttempts,
        firstSolvedAt: form.value.firstSolvedAt || null,
      });
    } else {
      await createScore({
        userId: form.value.userId,
        examId: form.value.examId,
        problemId: form.value.problemId,
        bestScore: form.value.bestScore,
        totalAttempts: form.value.totalAttempts,
        wrongAttempts: form.value.wrongAttempts,
        firstSolvedAt: form.value.firstSolvedAt || undefined,
      });
    }
    void router.push({ name: 'admin-scores' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = isEdit.value
      ? 'Failed to update score.'
      : 'Failed to create score.';
    errorRaw.value = e.raw;
  } finally {
    saving.value = false;
  }
}

function clearFirstSolved() {
  form.value.firstSolvedAt = '';
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
  <div class="max-w-[620px]">
    <div class="flex items-center gap-3 mb-6">
      <RegalButton @click="router.push({ name: 'admin-scores' })"
        >← Back</RegalButton
      >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit Score' : 'Create Score' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="save">
      <div
        v-if="isEdit"
        class="flex flex-col gap-3 px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
      >
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Student</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            readonlyInfo.student
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
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Problem</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            readonlyInfo.problem
          }}</span>
        </div>
      </div>

      <template v-if="!isEdit">
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >User <span class="text-primary ml-0.5">*</span></label
          >
          <RegalSelect
            v-model="form.userId"
            :options="userOptions"
            placeholder="Select user…"
            searchable
            required
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Exam <span class="text-primary ml-0.5">*</span></label
          >
          <RegalSelect
            v-model="form.examId"
            :options="examOptions"
            placeholder="Select exam…"
            searchable
            required
          />
        </div>
        <div class="flex flex-col gap-1.5">
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
      </template>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Best Score</label
        >
        <input
          v-model.number="form.bestScore"
          type="number"
          step="0.01"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
        />
      </div>

      <div class="flex flex-col sm:flex-row gap-3.5">
        <div class="flex-1 flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Total Attempts</label
          >
          <input
            v-model.number="form.totalAttempts"
            type="number"
            min="0"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Wrong Attempts</label
          >
          <input
            v-model.number="form.wrongAttempts"
            type="number"
            min="0"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >First Solved At</label
        >
        <div class="flex gap-2 items-center">
          <input
            v-model="form.firstSolvedAt"
            type="datetime-local"
            class="flex-1 bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
          <RegalButton
            v-if="form.firstSolvedAt"
            type="button"
            @click="clearFirstSolved"
            >Clear</RegalButton
          >
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
          {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Score' }}
        </RegalButton>
        <RegalButton
          type="button"
          @click="router.push({ name: 'admin-scores' })"
          >Cancel</RegalButton
        >
      </div>
    </form>
  </div>
</template>
