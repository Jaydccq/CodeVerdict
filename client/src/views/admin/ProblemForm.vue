<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getProblem,
  createProblem,
  updateProblem,
} from '../../services/adminApi';
import TestCaseEditor from './TestCaseEditor.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import RegalSelect from '../../components/admin/RegalSelect.vue';
import type { SelectOption } from '../../components/admin/RegalSelect.vue';
import type {
  TestCaseRow,
  CreateProblemPayload,
  UpdateProblemPayload,
} from '../../types/admin';

const route = useRoute();
const router = useRouter();

const examId = route.params.examId
  ? parseInt(String(route.params.examId), 10)
  : null;
const problemId = computed(() => {
  const id = route.params.id;
  return id ? parseInt(String(id), 10) : null;
});
const isEdit = computed(() => problemId.value !== null);

// ── Form state ────────────────────────────────────────────────────────────────
const questionType = ref<'coding' | 'mcq'>('coding');
const title = ref('');
const description = ref('');
const inputFormat = ref('');
const outputFormat = ref('');
const constraints = ref('');
const sampleInput = ref('');
const sampleOutput = ref('');
const difficulty = ref<'easy' | 'medium' | 'hard'>('medium');
const difficultyOptions: SelectOption[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
const displayOrder = ref(0);
const timeLimitMs = ref(2000);
const memoryLimitKb = ref(262144);
const maxScore = ref(10);
const testCases = ref<TestCaseRow[]>([]);
const starterCodeRows = ref<Array<{ langId: string; code: string }>>([]);
const referenceSolutionCode = ref('');
const referenceSolutionLanguageId = ref<string>('');
const refSolutionLangOptions: SelectOption[] = [
  { value: '71', label: 'Python 3 (71)' },
  { value: '54', label: 'C++ (54)' },
  { value: '50', label: 'C (50)' },
  { value: '62', label: 'Java (62)' },
  { value: '63', label: 'JavaScript (63)' },
];

// MCQ fields
const isMultiSelect = ref(false);
const questionImageData = ref<string | null>(null);
interface McqOptionRow {
  text: string;
  imageData: string | null;
  isCorrect: boolean;
}
const mcqOptions = ref<McqOptionRow[]>([]);

// ── UI state ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const errors = ref<Record<string, string>>({});

let tcKeyCounter = 0;
function makeKey() {
  return `tc_${Date.now()}_${tcKeyCounter++}`;
}

// ── Image helpers ─────────────────────────────────────────────────────────────
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URI prefix (e.g. "data:image/png;base64,")
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function onQuestionImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  questionImageData.value = await readFileAsBase64(file);
}

async function onOptionImageChange(e: Event, idx: number) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
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
  if (!isEdit.value) return;
  loading.value = true;
  loadError.value = '';
  try {
    const p = await getProblem(problemId.value!);
    questionType.value = p.questionType ?? 'coding';
    title.value = p.title;
    description.value = p.description;
    inputFormat.value = p.inputFormat ?? '';
    outputFormat.value = p.outputFormat ?? '';
    constraints.value = p.constraints ?? '';
    sampleInput.value = p.sampleInput ?? '';
    sampleOutput.value = p.sampleOutput ?? '';
    difficulty.value = (p.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard';
    displayOrder.value = p.displayOrder;
    timeLimitMs.value = p.timeLimitMs ?? 2000;
    memoryLimitKb.value = p.memoryLimitKb ?? 262144;
    maxScore.value = p.maxScore ?? 10;
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
    if (p.starterCode) {
      starterCodeRows.value = Object.entries(p.starterCode).map(
        ([langId, code]) => ({ langId, code: code }),
      );
    }
    referenceSolutionCode.value = p.referenceSolutionCode ?? '';
    referenceSolutionLanguageId.value = p.referenceSolutionLanguageId
      ? String(p.referenceSolutionLanguageId)
      : '';
    testCases.value = (p.testCases ?? [])
      .sort(
        (a: { displayOrder: number }, b: { displayOrder: number }) =>
          a.displayOrder - b.displayOrder,
      )
      .map(
        (tc: {
          id?: number;
          input: string;
          expectedOutput: string;
          isVisible: boolean;
          displayOrder: number;
        }) => ({
          _key: makeKey(),
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isVisible: tc.isVisible,
          displayOrder: tc.displayOrder,
        }),
      );
  } catch {
    loadError.value = 'Failed to load problem. Please go back and try again.';
  } finally {
    loading.value = false;
  }
});

// ── Validation ────────────────────────────────────────────────────────────────
function validate(): boolean {
  errors.value = {};
  if (!title.value.trim()) errors.value.title = 'Title is required.';
  if (!description.value.trim())
    errors.value.description = 'Description is required.';
  if (questionType.value === 'coding' && !(displayOrder.value >= 0))
    errors.value.displayOrder = 'Display order must be ≥ 0.';
  if (!(maxScore.value >= 1))
    errors.value.maxScore = 'Max score must be at least 1.';

  if (questionType.value === 'coding') {
    if (!(timeLimitMs.value >= 100))
      errors.value.timeLimitMs = 'Time limit must be at least 100ms.';
    if (!(memoryLimitKb.value >= 1024))
      errors.value.memoryLimitKb = 'Memory limit must be at least 1024 KB.';
    if (testCases.value.length === 0)
      errors.value.testCases = 'At least one test case is required.';
    for (const tc of testCases.value) {
      if (!tc.input.trim() || !tc.expectedOutput.trim()) {
        errors.value.testCases =
          'All test cases must have both input and expected output.';
        break;
      }
    }
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
  } else {
    // MCQ validation
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

  return Object.keys(errors.value).length === 0;
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    const base: Record<string, unknown> = {
      examId,
      title: title.value.trim(),
      description: description.value.trim(),
      difficulty: difficulty.value,
      ...(questionType.value === 'coding'
        ? { displayOrder: displayOrder.value }
        : {}),
      maxScore: maxScore.value,
      questionType: questionType.value,
    };
    if (examId) {
      base.examId = examId;
    }

    if (questionType.value === 'coding') {
      Object.assign(base, {
        inputFormat: inputFormat.value.trim() || undefined,
        outputFormat: outputFormat.value.trim() || undefined,
        constraints: constraints.value.trim() || undefined,
        sampleInput: sampleInput.value.trim() || undefined,
        sampleOutput: sampleOutput.value.trim() || undefined,
        timeLimitMs: timeLimitMs.value,
        memoryLimitKb: memoryLimitKb.value,
        starterCode: starterCodeRows.value.length
          ? Object.fromEntries(
              starterCodeRows.value
                .filter((r) => r.langId.trim())
                .map((r) => [r.langId.trim(), r.code]),
            )
          : undefined,
        testCases: testCases.value.map((tc, i) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isVisible: tc.isVisible,
          displayOrder: i,
        })),
        referenceSolutionCode: referenceSolutionCode.value.trim() || null,
        referenceSolutionLanguageId: referenceSolutionLanguageId.value
          ? Number(referenceSolutionLanguageId.value)
          : null,
      });
    } else {
      Object.assign(base, {
        isMultiSelect: isMultiSelect.value,
        questionImageData: questionImageData.value ?? undefined,
        mcqOptions: mcqOptions.value.map((o) => ({
          text: o.text.trim(),
          imageData: o.imageData ?? undefined,
          isCorrect: o.isCorrect,
        })),
      });
    }

    if (isEdit.value) {
      await updateProblem(problemId.value!, base as UpdateProblemPayload);
    } else {
      await createProblem(base as CreateProblemPayload);
    }

    void router.push(
      examId
        ? { name: 'admin-problems', params: { examId } }
        : { name: 'admin-all-problems' },
    );
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;
    errors.value.submit = msg ?? 'Save failed. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-[900px]">
    <div class="flex items-center gap-4 mb-7">
      <RegalButton
        @click="
          router.push(
            examId
              ? { name: 'admin-problems', params: { examId } }
              : { name: 'admin-all-problems' },
          )
        "
      >
        ← Problems
      </RegalButton>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit Problem' : 'Add Problem' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div
      v-else-if="loadError"
      class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg mb-4"
    >
      {{ loadError }}
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="save">
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

      <!-- Problem Details -->
      <section class="mb-6">
        <h3
          class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5"
        >
          Problem Details
        </h3>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6"
        >
          <div class="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Title <span class="text-primary ml-0.5">*</span></label
            >
            <input
              v-model="title"
              type="text"
              class="field"
              placeholder="Two Sum"
            />
            <span v-if="errors.title" class="text-xs text-red-400">{{
              errors.title
            }}</span>
          </div>

          <div class="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
            >
              {{ questionType === 'mcq' ? 'Question Stem' : 'Description' }}
              <span class="text-primary ml-0.5">*</span>
            </label>
            <textarea
              v-model="description"
              class="field resize-y min-h-[140px]"
              placeholder="Problem statement..."
            />
            <span v-if="errors.description" class="text-xs text-red-400">{{
              errors.description
            }}</span>
          </div>

          <!-- Coding-only detail fields -->
          <template v-if="questionType === 'coding'">
            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Input Format</label
              >
              <textarea
                v-model="inputFormat"
                class="field resize-y min-h-[100px]"
                rows="3"
                placeholder="Describe input format"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Output Format</label
              >
              <textarea
                v-model="outputFormat"
                class="field resize-y min-h-[100px]"
                rows="3"
                placeholder="Describe output format"
              />
            </div>

            <div class="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Constraints</label
              >
              <textarea
                v-model="constraints"
                class="field resize-y min-h-[100px]"
                rows="3"
                placeholder="1 ≤ n ≤ 10^5"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Sample Input</label
              >
              <textarea
                v-model="sampleInput"
                class="field font-mono text-[13px] resize-y min-h-[100px]"
                rows="4"
                placeholder="5&#10;1 2 3 4 5"
                spellcheck="false"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Sample Output</label
              >
              <textarea
                v-model="sampleOutput"
                class="field font-mono text-[13px] resize-y min-h-[100px]"
                rows="4"
                placeholder="15"
                spellcheck="false"
              />
            </div>
          </template>

          <!-- MCQ: question image upload -->
          <div
            v-if="questionType === 'mcq'"
            class="col-span-1 sm:col-span-2 flex flex-col gap-1.5"
          >
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Question Image
              <span class="text-[11px] font-normal">(optional)</span></label
            >
            <div class="flex items-center gap-3">
              <label
                class="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-background-dark text-sm text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-colors"
              >
                <span class="material-symbols-outlined text-[16px]"
                  >upload</span
                >
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
            <img
              v-if="questionImageData"
              :src="`data:image/png;base64,${questionImageData}`"
              alt="Preview"
              class="mt-2 max-h-48 object-contain rounded-lg border border-slate-200 dark:border-white/[0.06]"
            />
          </div>
        </div>
      </section>

      <!-- Settings -->
      <section class="mb-6">
        <h3
          class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5"
        >
          Settings
        </h3>
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6"
        >
          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Difficulty</label
            >
            <RegalSelect
              v-model="difficulty"
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
              v-model.number="displayOrder"
              type="number"
              class="field"
              min="0"
            />
            <span v-if="errors.displayOrder" class="text-xs text-red-400">{{
              errors.displayOrder
            }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label
              class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
              >Max Score</label
            >
            <input
              v-model.number="maxScore"
              type="number"
              class="field"
              min="1"
            />
            <span v-if="errors.maxScore" class="text-xs text-red-400">{{
              errors.maxScore
            }}</span>
          </div>

          <!-- Coding-only settings -->
          <template v-if="questionType === 'coding'">
            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Time Limit (ms)</label
              >
              <input
                v-model.number="timeLimitMs"
                type="number"
                class="field"
                min="100"
                step="100"
              />
              <span v-if="errors.timeLimitMs" class="text-xs text-red-400">{{
                errors.timeLimitMs
              }}</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                class="text-[13px] font-semibold text-slate-500 dark:text-slate-400"
                >Memory Limit (KB)</label
              >
              <input
                v-model.number="memoryLimitKb"
                type="number"
                class="field"
                min="1024"
                step="1024"
              />
              <span v-if="errors.memoryLimitKb" class="text-xs text-red-400">{{
                errors.memoryLimitKb
              }}</span>
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
      </section>

      <!-- MCQ Options -->
      <section v-if="questionType === 'mcq'" class="mb-6">
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

      <!-- Starter Code (coding only) -->
      <section v-if="questionType === 'coding'" class="mb-6">
        <div class="flex items-center justify-between mb-3.5">
          <div>
            <h3
              class="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Starter Code
              <span class="text-[11px] normal-case font-normal text-slate-400"
                >(optional)</span
              >
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Per-language boilerplate shown in the editor. Key = Judge0
              language ID (e.g. 71 = Python 3).
            </p>
          </div>
          <RegalButton
            type="button"
            @click="starterCodeRows.push({ langId: '', code: '' })"
            >+ Add Language</RegalButton
          >
        </div>
        <div
          v-if="starterCodeRows.length === 0"
          class="text-[12px] text-slate-400 px-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          No starter code defined - editor will use language boilerplate.
        </div>
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="(row, idx) in starterCodeRows"
            :key="idx"
            class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 flex flex-col gap-2"
          >
            <div class="flex items-center gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-slate-400"
                  >Language ID</label
                >
                <input
                  v-model="row.langId"
                  type="number"
                  min="1"
                  class="field w-24"
                  placeholder="71"
                />
              </div>
              <button
                type="button"
                class="ml-auto text-xs text-slate-400 hover:text-red-400 transition-colors mt-4"
                @click="starterCodeRows.splice(idx, 1)"
              >
                ✕ Remove
              </button>
            </div>
            <textarea
              v-model="row.code"
              class="field font-mono resize-y min-h-[100px]"
              placeholder="# Write your code here"
              spellcheck="false"
            />
          </div>
        </div>
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
              placeholder="Select language…"
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
      <section v-if="questionType === 'coding'" class="mb-6">
        <TestCaseEditor v-model="testCases" />
        <span v-if="errors.testCases" class="block mt-2 text-xs text-red-400">{{
          errors.testCases
        }}</span>
      </section>

      <div
        v-if="errors.submit"
        class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg mb-4"
      >
        {{ errors.submit }}
      </div>

      <div class="flex justify-end gap-2.5 pt-2">
        <RegalButton
          type="button"
          @click="
            router.push(
              examId
                ? { name: 'admin-problems', params: { examId } }
                : { name: 'admin-all-problems' },
            )
          "
        >
          Cancel
        </RegalButton>
        <RegalButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Problem' }}
        </RegalButton>
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
