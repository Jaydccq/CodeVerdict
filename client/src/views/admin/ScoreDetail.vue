<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getScoresByUserExam, deleteScore } from '../../services/adminApi';
import type { AdminScore } from '../../types/admin';
import ConfirmModal from '../../components/shared/ConfirmModal.vue';
import RegalButton from '../../components/admin/RegalButton.vue';

const route = useRoute();
const router = useRouter();

const scores = ref<AdminScore[]>([]);
const loading = ref(true);
const error = ref('');
const confirmDelete = ref<AdminScore | null>(null);
const deleting = ref(false);

const userId = computed(() => Number(route.params.userId));
const examId = computed(() => Number(route.params.examId));

const studentName = computed(() => {
  const u = scores.value[0]?.user;
  if (!u) return '-';
  return `${u.rollNumber} - ${u.firstName} ${u.lastName}`;
});

const examTitle = computed(() => scores.value[0]?.exam?.title ?? '-');

const totalScore = computed(() =>
  scores.value.reduce((sum, s) => sum + Number(s.bestScore), 0),
);

onMounted(async () => {
  loading.value = true;
  try {
    scores.value = await getScoresByUserExam(userId.value, examId.value);
  } catch {
    error.value = 'Failed to load scores.';
  } finally {
    loading.value = false;
  }
});

async function onDelete() {
  if (!confirmDelete.value) return;
  const id = confirmDelete.value.id;
  deleting.value = true;
  try {
    await deleteScore(id);
    scores.value = scores.value.filter((s) => s.id !== id);
    confirmDelete.value = null;
  } catch {
    error.value = 'Failed to delete score.';
    confirmDelete.value = null;
  } finally {
    deleting.value = false;
  }
}

function scoreColor(score: number) {
  if (score >= 7) return 'score-high';
  if (score >= 3) return 'score-mid';
  return 'score-low';
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}
</script>

<template>
  <div class="max-w-[1100px]">
    <div class="flex items-center gap-3 mb-6">
      <RegalButton @click="router.push({ name: 'admin-scores' })"
        >← Back</RegalButton
      >
      <h2 class="text-xl font-bold text-slate-900 dark:text-white">
        Score Detail
      </h2>
    </div>

    <div v-if="loading" class="text-sm text-slate-400">Loading…</div>
    <div v-else-if="error" class="text-sm text-red-400">{{ error }}</div>

    <template v-else>
      <!-- Summary card -->
      <div
        class="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-3.5 mb-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/[0.06] rounded-xl"
      >
        <div class="flex-1 space-y-1">
          <div class="text-sm font-medium text-slate-900 dark:text-white">
            {{ studentName }}
          </div>
          <div class="text-xs text-slate-500">{{ examTitle }}</div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div
              class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              Total Score
            </div>
            <div
              class="text-lg font-bold"
              :class="
                scoreColor(totalScore) === 'score-high'
                  ? 'text-emerald-500'
                  : scoreColor(totalScore) === 'score-mid'
                    ? 'text-amber-500'
                    : 'text-red-400'
              "
            >
              {{ totalScore.toFixed(2) }}
            </div>
          </div>
          <div class="text-center">
            <div
              class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold"
            >
              Problems
            </div>
            <div class="text-lg font-bold text-slate-900 dark:text-white">
              {{ scores.length }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="scores.length === 0" class="text-sm text-slate-400">
        No individual scores found for this student/exam combination.
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
                  Problem
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Best Score
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Attempts
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  Wrong
                </th>
                <th
                  class="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]"
                >
                  First Solved
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
                v-for="s in scores"
                :key="s.id"
                class="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
              >
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle font-medium"
                >
                  {{ s.problem?.title ?? '-' }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-semibold"
                  :class="
                    scoreColor(Number(s.bestScore)) === 'score-high'
                      ? 'text-emerald-500'
                      : scoreColor(Number(s.bestScore)) === 'score-mid'
                        ? 'text-amber-500'
                        : 'text-red-400'
                  "
                >
                  {{ Number(s.bestScore).toFixed(2) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-slate-200 align-middle"
                >
                  {{ s.totalAttempts }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                  :class="
                    s.wrongAttempts > 0
                      ? 'text-red-400'
                      : 'text-slate-900 dark:text-slate-200'
                  "
                >
                  {{ s.wrongAttempts }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle font-mono text-xs text-slate-500"
                >
                  {{ formatDate(s.firstSolvedAt) }}
                </td>
                <td
                  class="px-3.5 py-3 border-b border-slate-200 dark:border-white/[0.06] align-middle"
                >
                  <div class="flex gap-1.5 items-center">
                    <RegalButton
                      @click="
                        router.push({
                          name: 'admin-score-edit',
                          params: { id: s.id },
                        })
                      "
                    >
                      Edit
                    </RegalButton>
                    <RegalButton variant="danger" @click="confirmDelete = s">
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
            v-for="s in scores"
            :key="s.id"
            class="border border-slate-200 dark:border-white/[0.06] rounded-xl p-3.5 bg-white dark:bg-surface-dark"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="font-medium text-sm text-slate-900 dark:text-white">
                {{ s.problem?.title ?? '-' }}
              </div>
              <span
                class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0"
                :class="
                  scoreColor(Number(s.bestScore)) === 'score-high'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : scoreColor(Number(s.bestScore)) === 'score-mid'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-red-500/10 text-red-400'
                "
                >{{ Number(s.bestScore).toFixed(2) }}</span
              >
            </div>
            <div class="text-xs text-slate-500 space-y-0.5 mb-3">
              <div>
                Attempts: {{ s.totalAttempts }} &nbsp;·&nbsp; Wrong:
                {{ s.wrongAttempts }} &nbsp;·&nbsp; First solved:
                {{ formatDate(s.firstSolvedAt) }}
              </div>
            </div>
            <div class="flex gap-1.5 flex-wrap">
              <RegalButton
                @click="
                  router.push({
                    name: 'admin-score-edit',
                    params: { id: s.id },
                  })
                "
                >Edit</RegalButton
              >
              <RegalButton variant="danger" @click="confirmDelete = s"
                >Delete</RegalButton
              >
            </div>
          </div>
        </div>
      </template>
    </template>

    <ConfirmModal
      v-if="confirmDelete"
      title="Delete Score"
      :message="`Delete score for ${confirmDelete.problem?.title ?? 'this problem'}?`"
      confirm-label="Delete"
      :danger="true"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </div>
</template>
