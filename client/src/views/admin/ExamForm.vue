<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getExam,
  createExam,
  updateExam,
  deleteExam,
  invalidateCachedExams,
  listExamProblems,
  unassignProblemFromExam,
} from '../../services/adminApi';
import type { ProblemWithTestCases } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import LinkProblemModal from './LinkProblemModal.vue';
import { LANGUAGE_NAMES } from '../../data/languages';

const route = useRoute();
const router = useRouter();

const examId = computed(() => {
  const id = route.params.id;
  return id ? parseInt(String(id), 10) : null;
});
const isEdit = computed(() => examId.value !== null);

// ── Form state ────────────────────────────────────────────────────────────────
const title = ref('');
const startTime = ref('');
const endTime = ref('');
const durationMinutes = ref(120);
const isActive = ref(false);
const selectedLanguages = ref<number[]>([]);

const ALL_LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([id, label]) => ({
  id: Number(id),
  label,
}));

// ── Problems state (edit mode) ───────────────────────────────────────────────
const problems = ref<ProblemWithTestCases[]>([]);
const problemsTotal = ref(0);
const problemsLoading = ref(false);
const showLinkModal = ref(false);
const unlinking = ref<number | null>(null);
// Create mode: locally tracked problem IDs to link on save
const pendingProblemIds = ref<number[]>([]);
const pendingProblems = ref<
  {
    id: number;
    title: string;
    difficulty: string | null;
    testCaseCount: number;
  }[]
>([]);

// ── UI state ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const errors = ref<Record<string, string>>({});
const showDeleteConfirm = ref(false);
const deleting = ref(false);

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Load (edit mode) ──────────────────────────────────────────────────────────
onMounted(async () => {
  if (!isEdit.value) return;
  loading.value = true;
  loadError.value = '';
  try {
    const exam = await getExam(examId.value!);
    title.value = exam.title;
    startTime.value = toLocalInput(exam.startTime);
    endTime.value = toLocalInput(exam.endTime);
    durationMinutes.value = exam.durationMinutes;
    isActive.value = exam.isActive;
    selectedLanguages.value = [...exam.allowedLanguages];
    // Load first page of problems
    problemsLoading.value = true;
    try {
      const result = await listExamProblems(examId.value!, {
        page: 1,
        limit: 100,
      });
      problems.value = result.data;
      problemsTotal.value = result.total;
    } catch {
      // non-critical
    } finally {
      problemsLoading.value = false;
    }
  } catch {
    loadError.value = 'Failed to load exam. Please go back and try again.';
  } finally {
    loading.value = false;
  }
});

// ── Validation ────────────────────────────────────────────────────────────────
function validate(): boolean {
  errors.value = {};
  if (!title.value.trim()) errors.value.title = 'Title is required.';
  if (!startTime.value) errors.value.startTime = 'Start time is required.';
  if (!endTime.value) errors.value.endTime = 'End time is required.';
  if (
    startTime.value &&
    endTime.value &&
    new Date(endTime.value) <= new Date(startTime.value)
  ) {
    errors.value.endTime = 'End time must be after start time.';
  }
  if (!(durationMinutes.value >= 1))
    errors.value.durationMinutes = 'Duration must be at least 1 minute.';
  if (selectedLanguages.value.length === 0)
    errors.value.languages = 'Select at least one language.';
  return Object.keys(errors.value).length === 0;
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = {
      title: title.value.trim(),
      startTime: new Date(startTime.value).toISOString(),
      endTime: new Date(endTime.value).toISOString(),
      durationMinutes: durationMinutes.value,
      allowedLanguages: selectedLanguages.value,
      isActive: isActive.value,
    };

    if (isEdit.value) {
      await updateExam(examId.value!, payload);
    } else {
      await createExam({
        ...payload,
        ...(pendingProblemIds.value.length
          ? { problemIds: pendingProblemIds.value }
          : {}),
      });
    }
    invalidateCachedExams();
    void router.push({ name: 'admin-exams' });
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;
    errors.value.submit = msg ?? 'Save failed. Please try again.';
  } finally {
    saving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function onDelete() {
  deleting.value = true;
  try {
    await deleteExam(examId.value!);
    invalidateCachedExams();
    void router.push({ name: 'admin-exams' });
  } catch {
    errors.value.submit = 'Delete failed. Please try again.';
    showDeleteConfirm.value = false;
  } finally {
    deleting.value = false;
  }
}

function toggleLanguage(id: number) {
  const idx = selectedLanguages.value.indexOf(id);
  if (idx >= 0) {
    selectedLanguages.value.splice(idx, 1);
  } else {
    selectedLanguages.value.push(id);
  }
}

function onProblemSelected(problem: {
  id: number;
  title: string;
  difficulty: string | null;
  testCaseCount: number;
}) {
  if (!pendingProblemIds.value.includes(problem.id)) {
    pendingProblemIds.value.push(problem.id);
    pendingProblems.value.push(problem);
  }
  showLinkModal.value = false;
}

function removePendingProblem(id: number) {
  pendingProblemIds.value = pendingProblemIds.value.filter((pid) => pid !== id);
  pendingProblems.value = pendingProblems.value.filter((p) => p.id !== id);
}

async function unlinkProblem(problemId: number) {
  if (!examId.value) return;
  unlinking.value = problemId;
  try {
    await unassignProblemFromExam(problemId, examId.value);
    problems.value = problems.value.filter((p) => p.id !== problemId);
    problemsTotal.value--;
  } catch {
    errors.value.submit = 'Failed to unlink problem.';
  } finally {
    unlinking.value = null;
  }
}

async function onLinked() {
  showLinkModal.value = false;
  if (!examId.value) return;
  problemsLoading.value = true;
  try {
    const result = await listExamProblems(examId.value, {
      page: 1,
      limit: 100,
    });
    problems.value = result.data;
    problemsTotal.value = result.total;
  } catch {
    // non-critical
  } finally {
    problemsLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-[760px]">
    <div class="flex items-center gap-4 mb-7">
      <RegalButton @click="router.push({ name: 'admin-exams' })">
        ← Back
      </RegalButton>
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        {{ isEdit ? 'Edit Exam' : 'Create Exam' }}
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div
      v-else-if="loadError"
      class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg"
    >
      {{ loadError }}
    </div>

    <form v-else class="flex flex-col gap-6" @submit.prevent="save">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6"
      >
        <!-- Title -->
        <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >Title <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model="title"
            type="text"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            placeholder="Midterm Exam 2025"
          />
          <span v-if="errors.title" class="text-xs text-red-400">{{
            errors.title
          }}</span>
        </div>

        <!-- Start / End Time -->
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >Start Time <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model="startTime"
            type="datetime-local"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
          <span v-if="errors.startTime" class="text-xs text-red-400">{{
            errors.startTime
          }}</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >End Time <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model="endTime"
            type="datetime-local"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
          />
          <span v-if="errors.endTime" class="text-xs text-red-400">{{
            errors.endTime
          }}</span>
        </div>

        <!-- Duration -->
        <div class="flex flex-col gap-1.5">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >Duration (minutes)
            <span class="text-primary ml-0.5">*</span></label
          >
          <input
            v-model.number="durationMinutes"
            type="number"
            class="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
            min="1"
          />
          <span v-if="errors.durationMinutes" class="text-xs text-red-400">{{
            errors.durationMinutes
          }}</span>
        </div>

        <!-- Is Active -->
        <div class="flex flex-col gap-1.5 justify-start">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >Active</label
          >
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              role="switch"
              :aria-checked="isActive"
              class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
              :class="isActive ? 'bg-primary' : 'bg-slate-600'"
              @click="isActive = !isActive"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="isActive ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
            <span class="text-xs text-slate-400">{{
              isActive
                ? 'Yes - students can access this exam'
                : 'No - exam is hidden'
            }}</span>
          </div>
        </div>

        <!-- Languages -->
        <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
          <label
            class="text-[13px] font-medium text-slate-500 dark:text-slate-400"
            >Allowed Languages <span class="text-primary ml-0.5">*</span></label
          >
          <div class="flex flex-wrap gap-2">
            <label
              v-for="lang in ALL_LANGUAGES"
              :key="lang.id"
              class="flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg text-[13px] cursor-pointer transition-colors"
              :class="
                selectedLanguages.includes(lang.id)
                  ? 'border-primary text-primary bg-primary/[0.08]'
                  : 'border-slate-200 dark:border-white/[0.08] text-slate-500'
              "
            >
              <input
                type="checkbox"
                class="hidden"
                :checked="selectedLanguages.includes(lang.id)"
                @change="toggleLanguage(lang.id)"
              />
              {{ lang.label }}
            </label>
          </div>
          <span v-if="errors.languages" class="text-xs text-red-400">{{
            errors.languages
          }}</span>
        </div>
      </div>

      <!-- Problems section (create + edit) -->
      <div
        class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 sm:p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
              Linked Problems
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              <template v-if="isEdit"
                >{{ problemsTotal }} problem{{
                  problemsTotal !== 1 ? 's' : ''
                }}
                assigned to this exam</template
              >
              <template v-else
                >{{ pendingProblems.length }} problem{{
                  pendingProblems.length !== 1 ? 's' : ''
                }}
                selected</template
              >
            </p>
          </div>
          <RegalButton
            variant="primary"
            type="button"
            @click="showLinkModal = true"
          >
            Link Problem
          </RegalButton>
        </div>

        <!-- Edit mode: live problems -->
        <template v-if="isEdit">
          <div v-if="problemsLoading" class="text-xs text-slate-400">
            Loading…
          </div>
          <div v-else-if="problems.length === 0" class="text-xs text-slate-400">
            No problems linked yet.
          </div>
          <div
            v-else
            class="border border-slate-200 dark:border-white/[0.06] rounded-lg overflow-hidden"
          >
            <table class="w-full text-[13px]">
              <thead>
                <tr>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    #
                  </th>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Title
                  </th>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Difficulty
                  </th>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Score
                  </th>
                  <th
                    class="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  ></th>
                </tr>
              </thead>
              <tbody class="[&>tr:last-child>td]:border-b-0">
                <tr
                  v-for="p in problems"
                  :key="p.id"
                  class="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] font-mono text-xs text-slate-500"
                  >
                    {{ p.displayOrder }}
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 font-medium cursor-pointer hover:text-primary"
                    @click="
                      router.push({
                        name: 'admin-problem-edit',
                        params: { examId: examId, id: p.id },
                      })
                    "
                  >
                    {{ p.title }}
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    <span
                      class="inline-block px-2 py-0.5 text-xs font-medium rounded-md capitalize"
                      :class="{
                        'bg-emerald-500/10 text-emerald-500':
                          (p.difficulty ?? 'medium') === 'easy',
                        'bg-yellow-500/10 text-yellow-500':
                          (p.difficulty ?? 'medium') === 'medium',
                        'bg-red-500/10 text-red-400':
                          (p.difficulty ?? 'medium') === 'hard',
                      }"
                      >{{ p.difficulty ?? 'medium' }}</span
                    >
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200"
                  >
                    {{ p.maxScore ?? 10 }}
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-right"
                  >
                    <button
                      type="button"
                      class="text-xs text-slate-400 hover:text-red-400 transition-colors"
                      :disabled="unlinking === p.id"
                      @click.stop="unlinkProblem(p.id)"
                    >
                      {{ unlinking === p.id ? 'Unlinking…' : 'Unlink' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Create mode: pending problems -->
        <template v-else>
          <div
            v-if="pendingProblems.length === 0"
            class="text-xs text-slate-400"
          >
            No problems linked yet. Click "Link Problem" to add existing
            problems.
          </div>
          <div
            v-else
            class="border border-slate-200 dark:border-white/[0.06] rounded-lg overflow-hidden"
          >
            <table class="w-full text-[13px]">
              <thead>
                <tr>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Title
                  </th>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Difficulty
                  </th>
                  <th
                    class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    Test Cases
                  </th>
                  <th
                    class="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                  ></th>
                </tr>
              </thead>
              <tbody class="[&>tr:last-child>td]:border-b-0">
                <tr
                  v-for="p in pendingProblems"
                  :key="p.id"
                  class="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 font-medium"
                  >
                    {{ p.title }}
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06]"
                  >
                    <span
                      class="inline-block px-2 py-0.5 text-xs font-medium rounded-md capitalize"
                      :class="{
                        'bg-emerald-500/10 text-emerald-500':
                          (p.difficulty ?? 'medium') === 'easy',
                        'bg-yellow-500/10 text-yellow-500':
                          !p.difficulty || p.difficulty === 'medium',
                        'bg-red-500/10 text-red-400': p.difficulty === 'hard',
                      }"
                      >{{ p.difficulty ?? 'medium' }}</span
                    >
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-slate-500"
                  >
                    {{ p.testCaseCount }}
                  </td>
                  <td
                    class="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06] text-right"
                  >
                    <button
                      type="button"
                      class="text-xs text-slate-400 hover:text-red-400 transition-colors"
                      @click="removePendingProblem(p.id)"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <div
        v-if="errors.submit"
        class="text-[13px] text-red-400 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-lg"
      >
        {{ errors.submit }}
      </div>

      <div
        class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3"
      >
        <RegalButton
          v-if="isEdit"
          variant="danger"
          type="button"
          @click="showDeleteConfirm = true"
        >
          Delete Exam
        </RegalButton>
        <div class="flex gap-2.5 sm:ml-auto">
          <RegalButton
            type="button"
            @click="router.push({ name: 'admin-exams' })"
          >
            Cancel
          </RegalButton>
          <RegalButton
            variant="primary"
            size="sm"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Exam' }}
          </RegalButton>
        </div>
      </div>
    </form>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="Delete Exam"
      message="This will permanently delete the exam and all its problems, test cases, and submissions. This cannot be undone."
      confirm-label="Delete Permanently"
      :danger="true"
      @confirm="onDelete"
      @cancel="showDeleteConfirm = false"
    />

    <LinkProblemModal
      v-if="showLinkModal"
      :exam-id="isEdit ? examId! : undefined"
      :current-display-orders="problems.map((p) => p.displayOrder)"
      @linked="onLinked"
      @selected="onProblemSelected"
      @close="showLinkModal = false"
    />
  </div>
</template>
