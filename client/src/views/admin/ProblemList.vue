<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getExam,
  listExamProblems,
  deleteProblem,
} from '../../services/adminApi';
import type { ProblemWithTestCases } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import LinkProblemModal from './LinkProblemModal.vue';
import TablePagination from '../../components/shared/TablePagination.vue';
import RegalButton from '../../components/admin/RegalButton.vue';
import { usePagination } from '../../composables/usePagination';
import { PAGE_LIMIT } from '../../constants';

const route = useRoute();
const router = useRouter();
const examId = parseInt(String(route.params.examId), 10);

const examTitle = ref('');

const {
  items: problems,
  page,
  total,
  loading,
  error,
  load: loadProblems,
} = usePagination<ProblemWithTestCases>({
  fetcher: (params) => listExamProblems(examId, params),
});

const confirmDelete = ref<ProblemWithTestCases | null>(null);
const showLinkModal = ref(false);
const currentDisplayOrders = computed(() =>
  problems.value.map((p) => p.displayOrder),
);

onMounted(loadExamTitle);

async function loadExamTitle() {
  try {
    const exam = await getExam(examId);
    examTitle.value = exam.title;
  } catch {
    // title is non-critical
  }
}

async function onLinked() {
  showLinkModal.value = false;
  await loadProblems();
}

async function onDelete() {
  if (!confirmDelete.value) return;
  const idToDelete = confirmDelete.value.id;
  try {
    await deleteProblem(idToDelete);
    problems.value = problems.value.filter((p) => p.id !== idToDelete);
    total.value--;
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete problem. Please try again.';
    confirmDelete.value = null;
  }
}
</script>

<template>
  <div class="max-w-[960px]">
    <div
      class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3"
    >
      <div class="flex items-start gap-3">
        <RegalButton class="mt-1" @click="router.push({ name: 'admin-exams' })">
          ← Exams
        </RegalButton>
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">
            Problems
          </h2>
          <p v-if="examTitle" class="text-[13px] text-slate-500 mt-0.5">
            {{ examTitle }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <RegalButton @click="showLinkModal = true">
          ⇄ Link Existing
        </RegalButton>
        <RegalButton
          variant="primary"
          size="sm"
          @click="
            router.push({ name: 'admin-problem-create', params: { examId } })
          "
        >
          + Add Problem
        </RegalButton>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <div v-if="problems.length === 0" class="text-sm text-slate-400">
        No problems yet. Add the first one.
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
                  #
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Title
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Difficulty
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Max Score
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Test Cases
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Time Limit
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in problems"
                :key="p.id"
                class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                @click="
                  router.push({
                    name: 'admin-problem-edit',
                    params: { examId, id: p.id },
                  })
                "
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                >
                  {{ p.displayOrder }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ p.title }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
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
                  >
                    {{ p.difficulty ?? 'medium' }}
                  </span>
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ p.maxScore ?? 10 }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ p.testCases?.length ?? 0 }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                >
                  {{ (p.timeLimitMs ?? 2000) / 1000 }}s
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  @click.stop
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-problem-edit',
                          params: { examId, id: p.id },
                        })
                      "
                    >
                      Edit
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = p">
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
            v-for="p in problems"
            :key="p.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark cursor-pointer"
            @click="
              router.push({
                name: 'admin-problem-edit',
                params: { examId, id: p.id },
              })
            "
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ p.title }}
              </div>
              <span
                class="inline-block px-2 py-0.5 text-xs font-medium rounded-md capitalize flex-shrink-0"
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
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>
                Order: {{ p.displayOrder }} &nbsp;·&nbsp; Score:
                {{ p.maxScore ?? 10 }} &nbsp;·&nbsp; Time:
                {{ (p.timeLimitMs ?? 2000) / 1000 }}s
              </div>
              <div>Test cases: {{ p.testCases?.length ?? 0 }}</div>
            </div>
            <div class="flex gap-1.5 flex-wrap" @click.stop>
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-problem-edit',
                    params: { examId, id: p.id },
                  })
                "
                >Edit</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = p"
                >Delete</RegalButton
              >
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
      title="Delete Problem"
      :message="`Delete &quot;${confirmDelete.title}&quot;? All test cases and submissions for this problem will be removed.`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />

    <LinkProblemModal
      v-if="showLinkModal"
      :exam-id="examId"
      :current-display-orders="currentDisplayOrders"
      @linked="onLinked"
      @close="showLinkModal = false"
    />
  </div>
</template>
