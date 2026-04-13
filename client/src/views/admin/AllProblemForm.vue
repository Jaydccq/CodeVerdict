<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getProblem,
  createProblem,
  updateProblem,
  listExams,
} from '../../services/adminApi';
import type {
  ExamWithProblems,
  TestCaseRow,
  CreateProblemPayload,
  UpdateProblemPayload,
} from '../../types/admin';
import TestCaseEditor from './TestCaseEditor.vue';
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
const errors = ref<Record<string, string>>({});

const exams = ref<ExamWithProblems[]>([]);

const difficultyOptions: SelectOption[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

// ── Form state ────────────────────────────────────────────────────────────────
const questionType = ref<'coding' | 'mcq'>('coding');
const form = ref({
  examId: '' as number | '',
  title: '',
  description: '',
  inputFormat: '',
  outputFormat: '',
  constraints: '',
  sampleInput: '',
  sampleOutput: '',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  displayOrder: 0,
  timeLimitMs: 2000,
  memoryLimitKb: 262144,
  maxScore: 10,
});

const testCases = ref<TestCaseRow[]>([]);
let keyCounter = 0;
const referenceSolutionCode = ref('');
const referenceSolutionLanguageId = ref<string>('');
const refSolutionLangOptions: SelectOption[] = [
  { value: '113', label: 'Python (113)' },
  { value: '109', label: 'Python 3.13.2 (109)' },
  { value: '105', label: 'C++ (105)' },
  { value: '54', label: 'C++ GCC 9.2.0 (54)' },
  { value: '103', label: 'C (103)' },
  { value: '50', label: 'C GCC 9.2.0 (50)' },
  { value: '91', label: 'Java (91)' },
  { value: '62', label: 'Java OpenJDK 13.0.1 (62)' },
  { value: '102', label: 'JavaScript (102)' },
  { value: '97', label: 'JavaScript Node.js 20.17.0 (97)' },
];

// ── MCQ fields ────────────────────────────────────────────────────────────────
const isMultiSelect = ref(false);
const questionImageData = ref<string | null>(null);
interface McqOptionRow {
  text: string;
  imageData: string | null;
  isCorrect: boolean;
}
const mcqOptions = ref<McqOptionRow[]>([]);

// ── Image helpers ─────────────────────────────────────────────────────────────
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const imageError = ref('');

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function checkImageSize(file: File): boolean {
  if (file.size > IMAGE_MAX_BYTES) {
    imageError.value = `Image "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB - maximum allowed size is 5 MB.`;
    return false;
  }
  imageError.value = '';
  return true;
}

async function onQuestionImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!checkImageSize(file)) {
    (e.target as HTMLInputElement).value = '';
    return;
  }
  questionImageData.value = await readFileAsBase64(file);
}

async function onOptionImageChange(e: Event, idx: number) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!checkImageSize(file)) {
    (e.target as HTMLInputElement).value = '';
    return;
  }
  mcqOptions.value[idx].imageData = await readFileAsBase64(file);
}

function addOption() {
  mcqOptions.value.push({ text: '', imageData: null, isCorrect: false });
}

function removeOption(idx: number) {
  mcqOptions.value.splice(idx, 1);
}

// ── Load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  try {
    if (isEdit.value) {
      const p = await getProblem(Number(route.params.id));
      questionType.value = p.questionType ?? 'coding';
      form.value = {
        examId: p.examId,
        title: p.title ?? '',
        description: p.description ?? '',
        inputFormat: p.inputFormat ?? '',
        outputFormat: p.outputFormat ?? '',
        constraints: p.constraints ?? '',
        sampleInput: p.sampleInput ?? '',
        sampleOutput: p.sampleOutput ?? '',
        difficulty: (p.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard',
        displayOrder: p.displayOrder ?? 0,
        timeLimitMs: p.timeLimitMs ?? 2000,
        memoryLimitKb: p.memoryLimitKb ?? 262144,
        maxScore: p.maxScore ?? 10,
      };
      isMultiSelect.value = p.isMultiSelect ?? false;
      questionImageData.value = p.questionImageData ?? null;
      if (p.mcqOptions?.length) {
        mcqOptions.value = (
          p.mcqOptions as Array<{
            text: string;
            imageData?: string | null;
            isCorrect: boolean;
          }>
        ).map((o) => ({
          text: o.text,
          imageData: o.imageData ?? null,
          isCorrect: o.isCorrect,
        }));
      }
      testCases.value = (p.testCases ?? []).map(
        (tc: {
          id?: number;
          input: string;
          expectedOutput: string;
          isVisible?: boolean;
          displayOrder: number;
        }) => ({
          _key: `tc-${++keyCounter}`,
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isVisible: tc.isVisible ?? false,
          displayOrder: tc.displayOrder,
        }),
      );
      referenceSolutionCode.value = p.referenceSolutionCode ?? '';
      referenceSolutionLanguageId.value = p.referenceSolutionLanguageId
        ? String(p.referenceSolutionLanguageId)
        : '';
      exams.value = (await listExams({ limit: 100 })).data;
    } else {
      exams.value = (await listExams({ limit: 100 })).data;
    }
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = 'Failed to load data.';
    errorRaw.value = e.raw;
  } finally {
    loading.value = false;
  }
});

const examName = computed(() => {
  const e = exams.value.find((ex) => ex.id === form.value.examId);
  return e?.title ?? '-';
});

// ── Validation ────────────────────────────────────────────────────────────────
function validate(): boolean {
  errors.value = {};
  if (!form.value.title.trim()) errors.value.title = 'Title is required.';
  if (!form.value.description.trim())
    errors.value.description = 'Description is required.';

  if (questionType.value === 'mcq') {
    if (mcqOptions.value.length < 2) {
      errors.value.mcqOptions = 'At least 2 options are required.';
    } else {
      for (const opt of mcqOptions.value) {
        if (!opt.text.trim()) {
          errors.value.mcqOptions = 'All options must have text.';
          break;
        }
      }
      const correctCount = mcqOptions.value.filter((o) => o.isCorrect).length;
      if (!isMultiSelect.value && correctCount !== 1) {
        errors.value.mcqOptions =
          'Single-select questions must have exactly 1 correct option.';
      } else if (isMultiSelect.value && correctCount < 1) {
        errors.value.mcqOptions =
          'Multi-select questions must have at least 1 correct option.';
      }
    }
  }

  if (questionType.value === 'coding') {
    if (
      referenceSolutionCode.value.trim() &&
      !referenceSolutionLanguageId.value
    ) {
      errors.value.referenceSolution =
        'Language is required when providing solution code.';
    }
    if (
      referenceSolutionLanguageId.value &&
      !referenceSolutionCode.value.trim()
    ) {
      errors.value.referenceSolution =
        'Solution code is required when selecting a language.';
    }
  }

  return Object.keys(errors.value).length === 0;
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  if (!validate()) return;
  saving.value = true;
  error.value = '';
  errorRaw.value = '';
  try {
    const payload: Record<string, unknown> = {
      ...form.value,
      questionType: questionType.value,
    };

    if (questionType.value === 'coding') {
      payload.testCases = testCases.value.map((tc, i) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isVisible: tc.isVisible,
        displayOrder: tc.displayOrder ?? i,
      }));
      payload.referenceSolutionCode =
        referenceSolutionCode.value.trim() || null;
      payload.referenceSolutionLanguageId = referenceSolutionLanguageId.value
        ? Number(referenceSolutionLanguageId.value)
        : null;
    } else {
      payload.isMultiSelect = isMultiSelect.value;
      payload.questionImageData = questionImageData.value ?? undefined;
      payload.mcqOptions = mcqOptions.value.map((o) => ({
        text: o.text.trim(),
        imageData: o.imageData ?? undefined,
        isCorrect: o.isCorrect,
      }));
    }

    if (!payload.examId) {
      delete payload.examId;
      delete payload.displayOrder;
    }
    if (isEdit.value) {
      delete payload.examId;
      await updateProblem(
        Number(route.params.id),
        payload as UpdateProblemPayload,
      );
    } else {
      await createProblem(payload as CreateProblemPayload);
    }
    void router.push({ name: 'admin-all-problems' });
  } catch (err: unknown) {
    const e = extractError(err);
    error.value = isEdit.value
      ? 'Failed to update problem.'
      : 'Failed to create problem.';
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
  <div class="max-w-[900px]">
    <div class="flex items-center gap-3 mb-6">
      <RegalButton @click="router.push({ name: 'admin-all-problems' })"
        >← Back</RegalButton
      >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit Problem' : 'Create Problem' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="save">
      <!-- Exam selector / display -->
      <div v-if="!isEdit" class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Exam</label
        >
        <select
          v-model="form.examId"
          class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
        >
          <option value="">None (standalone)</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">
            {{ e.title }}
          </option>
        </select>
      </div>
      <div
        v-else
        class="flex gap-6 px-4 py-3 bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-white/[0.06]"
      >
        <div class="flex flex-col gap-0.5">
          <span
            class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >Exam</span
          >
          <span class="text-sm text-slate-900 dark:text-white">{{
            examName
          }}</span>
        </div>
      </div>

      <!-- Question Type Toggle -->
      <section class="mb-2">
        <h3
          class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5"
        >
          Question Type
        </h3>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all"
            :class="
              questionType === 'coding'
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/[0.06] text-slate-500 hover:border-slate-300'
            "
            @click="questionType = 'coding'"
          >
            <span class="material-symbols-outlined text-[16px]">code</span>
            Coding
          </button>
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all"
            :class="
              questionType === 'mcq'
                ? 'bg-violet-500/10 border-violet-500/40 text-violet-600 dark:text-violet-400'
                : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/[0.06] text-slate-500 hover:border-slate-300'
            "
            @click="questionType = 'mcq'"
          >
            <span class="material-symbols-outlined text-[16px]">quiz</span>
            Multiple Choice
          </button>
        </div>
      </section>

      <!-- Common fields: Title & Description -->
      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Title <span class="text-primary ml-0.5">*</span></label
        >
        <input v-model="form.title" class="field" required />
        <span v-if="errors.title" class="text-xs text-red-400">{{
          errors.title
        }}</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
        >
          {{ questionType === 'mcq' ? 'Question Stem' : 'Description' }}
          <span class="text-primary ml-0.5">*</span>
        </label>
        <textarea
          v-model="form.description"
          class="field resize-y min-h-[100px]"
          rows="4"
          required
        ></textarea>
        <span v-if="errors.description" class="text-xs text-red-400">{{
          errors.description
        }}</span>
      </div>

      <!-- Coding-only detail fields -->
      <template v-if="questionType === 'coding'">
        <div class="flex flex-col sm:flex-row gap-3.5">
          <div class="flex-1 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Input Format</label
            >
            <textarea
              v-model="form.inputFormat"
              class="field resize-y min-h-[100px]"
              rows="2"
            ></textarea>
          </div>
          <div class="flex-1 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Output Format</label
            >
            <textarea
              v-model="form.outputFormat"
              class="field resize-y min-h-[100px]"
              rows="2"
            ></textarea>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Constraints</label
          >
          <textarea
            v-model="form.constraints"
            class="field resize-y min-h-[100px]"
            rows="2"
          ></textarea>
        </div>

        <div class="flex flex-col sm:flex-row gap-3.5">
          <div class="flex-1 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Sample Input</label
            >
            <textarea
              v-model="form.sampleInput"
              class="field font-mono text-[13px] resize-y min-h-[100px]"
              rows="3"
            ></textarea>
          </div>
          <div class="flex-1 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Sample Output</label
            >
            <textarea
              v-model="form.sampleOutput"
              class="field font-mono text-[13px] resize-y min-h-[100px]"
              rows="3"
            ></textarea>
          </div>
        </div>
      </template>

      <!-- MCQ: question image upload -->
      <div v-if="questionType === 'mcq'" class="flex flex-col gap-1.5">
        <label
          class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
          >Question Image
          <span class="text-[11px] font-normal">(optional)</span></label
        >
        <div class="flex items-center gap-3">
          <label
            class="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-background-dark text-sm text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-colors"
          >
            <span class="material-symbols-outlined text-[16px]">upload</span>
            Upload Image
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="onQuestionImageChange"
            />
          </label>
          <button
            v-if="questionImageData"
            type="button"
            class="text-xs text-red-400 hover:text-red-500"
            @click="questionImageData = null"
          >
            ✕ Remove
          </button>
        </div>
        <span v-if="imageError" class="text-xs text-red-400">{{
          imageError
        }}</span>
        <img
          v-if="questionImageData"
          :src="`data:image/png;base64,${questionImageData}`"
          alt="Preview"
          class="mt-2 max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/[0.06]"
        />
      </div>

      <!-- Settings -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Difficulty</label
          >
          <RegalSelect
            v-model="form.difficulty"
            :options="difficultyOptions"
            placeholder="Select difficulty…"
          />
        </div>
        <div v-if="questionType === 'coding'" class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Display Order</label
          >
          <input
            v-model.number="form.displayOrder"
            type="number"
            min="0"
            class="field"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Max Score</label
          >
          <input
            v-model.number="form.maxScore"
            type="number"
            min="1"
            class="field"
          />
        </div>

        <!-- Coding-only settings -->
        <template v-if="questionType === 'coding'">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Time Limit (ms)</label
            >
            <input
              v-model.number="form.timeLimitMs"
              type="number"
              min="100"
              class="field"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Memory (KB)</label
            >
            <input
              v-model.number="form.memoryLimitKb"
              type="number"
              min="1024"
              class="field"
            />
          </div>
        </template>

        <!-- MCQ: multi-select toggle -->
        <div v-if="questionType === 'mcq'" class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >Answer Type</label
          >
          <label class="flex items-center gap-2 cursor-pointer mt-1">
            <input
              v-model="isMultiSelect"
              type="checkbox"
              class="accent-primary w-4 h-4"
            />
            <span class="text-sm text-slate-700 dark:text-slate-300"
              >Multi-select</span
            >
          </label>
          <p class="text-[11px] text-slate-400">
            Checked = student can select multiple answers.
          </p>
        </div>
      </div>

      <!-- MCQ Options -->
      <section v-if="questionType === 'mcq'">
        <div class="flex items-center justify-between mb-3.5">
          <div>
            <h3
              class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Options <span class="text-primary ml-0.5">*</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">
              At least 2 required. Options are shuffled for each student.
            </p>
          </div>
          <RegalButton type="button" @click="addOption"
            >+ Add Option</RegalButton
          >
        </div>

        <div
          v-if="mcqOptions.length === 0"
          class="text-[12px] text-slate-400 px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          No options yet - click "Add Option" to start.
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="(opt, idx) in mcqOptions"
            :key="idx"
            class="bg-white dark:bg-surface-dark border rounded-xl p-4 flex flex-col gap-3 transition-colors"
            :class="
              opt.isCorrect
                ? 'border-emerald-400/40 dark:border-emerald-500/30'
                : 'border-slate-200 dark:border-white/[0.06]'
            "
          >
            <div class="flex items-start gap-3">
              <span
                class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono mt-0.5 bg-slate-100 dark:bg-white/[0.05] text-slate-500"
              >
                {{ idx + 1 }}
              </span>
              <div class="flex-1 flex flex-col gap-2">
                <input
                  v-model="opt.text"
                  type="text"
                  class="field"
                  :placeholder="`Option ${idx + 1} text`"
                />
                <div class="flex items-center gap-4 flex-wrap">
                  <label
                    class="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <input
                      v-model="opt.isCorrect"
                      type="checkbox"
                      class="accent-emerald-500 w-4 h-4"
                    />
                    <span class="text-slate-700 dark:text-slate-300 font-medium"
                      >Correct answer</span
                    >
                  </label>
                  <label
                    class="cursor-pointer flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <span class="material-symbols-outlined text-[15px]"
                      >image</span
                    >
                    {{ opt.imageData ? 'Change image' : 'Add image' }}
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="(e) => onOptionImageChange(e, idx)"
                    />
                  </label>
                  <button
                    v-if="opt.imageData"
                    type="button"
                    class="text-xs text-red-400 hover:text-red-500"
                    @click="opt.imageData = null"
                  >
                    ✕ Remove image
                  </button>
                </div>
                <img
                  v-if="opt.imageData"
                  :src="`data:image/png;base64,${opt.imageData}`"
                  alt="Option image"
                  class="max-h-28 object-contain rounded border border-slate-200 dark:border-white/[0.06]"
                />
              </div>
              <button
                type="button"
                class="flex-shrink-0 text-slate-400 hover:text-red-400 transition-colors mt-0.5"
                @click="removeOption(idx)"
              >
                <span class="material-symbols-outlined text-[18px]"
                  >delete</span
                >
              </button>
            </div>
          </div>
        </div>
        <span
          v-if="errors.mcqOptions"
          class="block mt-2 text-xs text-red-400"
          >{{ errors.mcqOptions }}</span
        >
      </section>

      <!-- Reference Solution (coding only) -->
      <section v-if="questionType === 'coding'" class="mb-6">
        <h3
          class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5"
        >
          Reference Solution
          <span class="text-[11px] normal-case font-normal text-slate-400"
            >(optional - generates expected output for custom input runs)</span
          >
        </h3>
        <div
          class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6 flex flex-col gap-3"
        >
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Language</label
            >
            <RegalSelect
              v-model="referenceSolutionLanguageId"
              :options="refSolutionLangOptions"
              placeholder="Select language..."
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Solution Code</label
            >
            <textarea
              v-model="referenceSolutionCode"
              class="field font-mono text-[13px] resize-y min-h-[200px]"
              placeholder="# Paste your reference solution here"
              spellcheck="false"
            />
          </div>
        </div>
        <span
          v-if="errors.referenceSolution"
          class="block mt-2 text-xs text-red-400"
          >{{ errors.referenceSolution }}</span
        >
      </section>

      <!-- Test Cases (coding only) -->
      <template v-if="questionType === 'coding'">
        <TestCaseEditor v-model="testCases" />
      </template>

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
          {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Problem' }}
        </RegalButton>
        <RegalButton
          type="button"
          @click="router.push({ name: 'admin-all-problems' })"
          >Cancel</RegalButton
        >
      </div>
    </form>
  </div>
</template>

<style scoped>
.field {
  @apply w-full bg-slate-50 dark:bg-background-dark
         border border-slate-200 dark:border-white/[0.08]
         rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white
         focus:border-primary/50 focus:ring-1 focus:ring-primary/20
         outline-none transition-colors;
}
</style>
