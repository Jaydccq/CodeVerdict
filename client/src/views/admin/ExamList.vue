<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  listExams,
  deleteExam,
  duplicateExam,
  invalidateCachedExams,
} from '../../services/adminApi';
import { getExamStatus } from '../../types/admin';
import type { ExamWithProblems } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import TablePagination from '../../components/shared/TablePagination.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

const router = useRouter();

const {
  items: exams,
  page,
  total,
  loading,
  error,
  load,
} = usePagination<ExamWithProblems>({
  fetcher: (params) => listExams(params),
});

const confirmDelete = ref<ExamWithProblems | null>(null);
const deleting = ref(false);

const duplicateTarget = ref<ExamWithProblems | null>(null);
const duplicateTitle = ref('');
const duplicateStartTime = ref('');
const duplicateEndTime = ref('');
const duplicating = ref(false);

async function onDelete() {
  if (!confirmDelete.value) return;
  const idToDelete = confirmDelete.value.id; // capture before await - ref may change
  deleting.value = true;
  try {
    await deleteExam(idToDelete);
    exams.value = exams.value.filter((e) => e.id !== idToDelete);
    total.value--;
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete exam. Please try again.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

function openDuplicate(exam: ExamWithProblems) {
  duplicateTarget.value = exam;
  duplicateTitle.value = `Copy of ${exam.title}`;
  duplicateStartTime.value = '';
  duplicateEndTime.value = '';
}

async function onDuplicate() {
  if (
    !duplicateTarget.value ||
    !duplicateTitle.value.trim() ||
    !duplicateStartTime.value ||
    !duplicateEndTime.value
  )
    return;
  duplicating.value = true;
  try {
    await duplicateExam(
      duplicateTarget.value.id,
      duplicateTitle.value.trim(),
      new Date(duplicateStartTime.value).toISOString(),
      new Date(duplicateEndTime.value).toISOString(),
    );
    invalidateCachedExams();
    duplicateTarget.value = null;
    await load();
  } catch {
    error.value = 'Failed to duplicate exam. Please try again.';
    duplicateTarget.value = null;
  } finally {
    duplicating.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(exam: ExamWithProblems) {
  return getExamStatus(exam);
}
</script>

<template>
  <div class="max-w-[1100px]">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
    >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">Exams</h2>
      <RegalButton
        variant="primary"
        size="sm"
        @click="router.push({ name: 'admin-exam-create' })"
      >
        + Create Exam
      </RegalButton>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="exams.length === 0" class="text-sm text-slate-400">
        No exams yet.
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div
          class="hidden sm:block overflow-x-auto border border-slate-200 dark:border-white/[0.06] rounded-xl"
        >
          <table class="w-full text-[13px]">
            <thead>
              <tr>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Title
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Start
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  End
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Duration
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Problems
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Status
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="[&>tr:last-child>td]:border-b-0">
              <tr
                v-for="exam in exams"
                :key="exam.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                @click="
                  router.push({
                    name: 'admin-exam-edit',
                    params: { id: exam.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ exam.title }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ formatDate(exam.startTime) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-mono text-xs text-slate-500"
                >
                  {{ formatDate(exam.endTime) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ exam.durationMinutes }}m
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ exam.problems?.length ?? 0 }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  <span
                    class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                    :class="{
                      'bg-emerald-500/10 text-emerald-500':
                        statusLabel(exam) === 'active',
                      'bg-yellow-500/10 text-yellow-500':
                        statusLabel(exam) === 'upcoming',
                      'bg-slate-500/10 text-slate-400':
                        statusLabel(exam) === 'ended',
                    }"
                  >
                    {{ statusLabel(exam) }}
                  </span>
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-problems',
                          params: { examId: exam.id },
                        })
                      "
                    >
                      Problems
                    </RegalButton>
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-leaderboard',
                          params: { examId: exam.id },
                        })
                      "
                    >
                      Leaderboard
                    </RegalButton>
                    <RegalButton variant="accent" @click="openDuplicate(exam)">
                      Duplicate
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = exam">
                      Delete
                    </RegalButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="sm:hidden space-y-2">
          <div
            v-for="exam in exams"
            :key="exam.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({ name: 'admin-exam-edit', params: { id: exam.id } })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ exam.title }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex-shrink-0"
                :class="{
                  'bg-emerald-500/10 text-emerald-500':
                    statusLabel(exam) === 'active',
                  'bg-yellow-500/10 text-yellow-500':
                    statusLabel(exam) === 'upcoming',
                  'bg-slate-500/10 text-slate-400':
                    statusLabel(exam) === 'ended',
                }"
                >{{ statusLabel(exam) }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>Start: {{ formatDate(exam.startTime) }}</div>
              <div>End: {{ formatDate(exam.endTime) }}</div>
              <div>
                Duration: {{ exam.durationMinutes }}m &nbsp;·&nbsp; Problems:
                {{ exam.problems?.length ?? 0 }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-problems',
                    params: { examId: exam.id },
                  })
                "
              >
                Problems
              </RegalButton>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-leaderboard',
                    params: { examId: exam.id },
                  })
                "
              >
                Leaderboard
              </RegalButton>
              <RegalButton variant="accent" @click="openDuplicate(exam)">
                Duplicate
              </RegalButton>
              <RegalButton variant="danger" @click="confirmDelete = exam">
                Delete
              </RegalButton>
            </div>
          </div>
        </div>
      </template>
    </template>

    <TablePagination
      :page="page"
      :total="total"
      :limit="PAGE_LIMIT"
      @update:page="page = $event"
    />

    <ConfirmModal
      v-if="confirmDelete"
      title="Delete Exam"
      :message="`Delete &quot;${confirmDelete.title}&quot;? This will also remove all problems, test cases, and submissions.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />

    <!-- Duplicate modal -->
    <Teleport to="body">
      <div
        v-if="duplicateTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        @click.self="duplicateTarget = null"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] w-full max-w-md p-6"
        >
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">
            Duplicate Exam
          </h3>
          <p class="text-sm text-slate-500 mb-4">
            Enter a name for the new exam. All problems and test cases will be
            copied. The new exam will be inactive.
          </p>
          <label
            class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >New Exam Name</label
          >
          <input
            v-model="duplicateTitle"
            type="text"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            placeholder="Exam title"
            autofocus
            @keydown.esc="duplicateTarget = null"
          />
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >Start Time</label
              >
              <input
                v-model="duplicateStartTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >End Time</label
              >
              <input
                v-model="duplicateEndTime"
                type="datetime-local"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <RegalButton size="sm" @click="duplicateTarget = null">
              Cancel
            </RegalButton>
            <RegalButton
              variant="primary"
              size="sm"
              :disabled="
                duplicating ||
                !duplicateTitle.trim() ||
                !duplicateStartTime ||
                !duplicateEndTime
              "
              @click="onDuplicate"
            >
              {{ duplicating ? 'Duplicating…' : 'Duplicate' }}
            </RegalButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
