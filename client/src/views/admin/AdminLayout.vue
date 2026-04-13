<script setup lang="ts">
// PRESERVED: all imports, route/router/authStore usage
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../composables/useTheme';
import { listExams } from '../../services/adminApi';
import type { ExamWithProblems } from '../../types/admin';
import { brand } from '../../config/brand';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();
const mobileNavOpen = ref(false);

const activeExams = ref<ExamWithProblems[]>([]);

async function checkActiveExams() {
  try {
    const result = await listExams({ limit: 100 });
    activeExams.value = result.data.filter((e) => e.isActive);
  } catch {
    // silently fail - info badge is non-critical
  }
}

onMounted(checkActiveExams);

// Re-check when navigating away from exam edit/create pages
watch(
  () => route.name,
  (_newName, oldName) => {
    const examEditRoutes = ['admin-exam-edit', 'admin-exam-create'];
    if (oldName && examEditRoutes.includes(String(oldName))) {
      void checkActiveExams();
    }
  },
);

const navLinks = [
  { name: 'admin-dashboard', label: 'Dashboard', icon: 'dashboard' },
  { name: 'admin-exams', label: 'Exams', icon: 'quiz' },
  { name: 'admin-all-problems', label: 'Problems', icon: 'code' },
  { name: 'admin-testcases', label: 'Test Cases', icon: 'checklist' },
  { name: 'admin-users', label: 'Users', icon: 'group' },
  { name: 'admin-submissions', label: 'Submissions', icon: 'send' },
  { name: 'admin-scores', label: 'Scores', icon: 'leaderboard' },
  { name: 'admin-autosaves', label: 'AutoSave', icon: 'save' },
  { name: 'admin-run-logs', label: 'Run Logs', icon: 'terminal' },
];

function isActive(routeName: string) {
  const name = String(route.name ?? '');
  if (routeName === 'admin-exams') {
    return (
      name === 'admin-exams' ||
      name === 'admin-exam-create' ||
      name === 'admin-exam-edit' ||
      name === 'admin-problems' ||
      name === 'admin-problem-create' ||
      name === 'admin-problem-edit' ||
      name === 'admin-leaderboard'
    );
  }
  if (routeName === 'admin-all-problems') {
    return name.startsWith('admin-all-problem');
  }
  if (routeName === 'admin-testcases') {
    return name.startsWith('admin-testcase');
  }
  if (routeName === 'admin-users') {
    return name.startsWith('admin-user');
  }
  if (routeName === 'admin-submissions') {
    return name.startsWith('admin-submission');
  }
  if (routeName === 'admin-scores') {
    return name.startsWith('admin-score');
  }
  if (routeName === 'admin-autosaves') {
    return name.startsWith('admin-autosave');
  }
  if (routeName === 'admin-run-logs') {
    return name === 'admin-run-logs';
  }
  if (routeName === 'admin-problem-views') {
    return name === 'admin-problem-views';
  }
  return name === routeName;
}

const activeLabel = computed(() => {
  const matched = route.matched.at(-1);
  const name = String(matched?.name ?? '');
  if (name.includes('dashboard')) return 'Dashboard';
  if (name.includes('leaderboard')) return 'Leaderboard';
  if (name.includes('autosave')) return 'AutoSave';
  if (name === 'admin-run-logs') return 'Run Logs';
  if (name === 'admin-problem-views') return 'Views';
  if (name.includes('all-problem')) return 'Problems';
  if (name.includes('testcase')) return 'Test Cases';
  if (name.includes('user')) return 'Users';
  if (name.includes('submission')) return 'Submissions';
  if (name.includes('score')) return 'Scores';
  if (name.includes('problem')) return 'Problems';
  if (name.includes('exam')) return 'Exams';
  return 'Admin';
});

function logout() {
  authStore.logout();
  void router.replace({ name: 'admin-login' });
}
</script>

<template>
  <div
    class="flex flex-col h-full overflow-hidden bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100"
  >
    <!-- Top Bar -->
    <header
      class="flex items-center justify-between h-12 px-5 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0 gap-4"
    >
      <!-- Left: Logo + Admin badge -->
      <div class="flex items-center gap-3 min-w-[160px]">
        <button
          class="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors mr-1"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <span class="material-symbols-outlined text-[20px]">menu</span>
        </button>
        <img
          :src="brand.logoPath"
          :alt="brand.appName"
          class="h-7 object-contain"
          style="filter: drop-shadow(0 0 8px rgb(var(--color-primary)))"
        />
        <span
          class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1"
          >Admin</span
        >
      </div>

      <!-- Center: Breadcrumb -->
      <div class="flex-1 text-center">
        <span
          class="text-sm font-semibold text-slate-600 dark:text-slate-400"
          >{{ activeLabel }}</span
        >
      </div>

      <!-- Right: Theme toggle + User + Logout -->
      <div class="flex items-center gap-3 min-w-[160px] justify-end">
        <button
          class="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          :title="
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          "
          @click="toggleTheme"
        >
          <span class="material-symbols-outlined text-[18px]">{{
            theme === 'dark' ? 'light_mode' : 'dark_mode'
          }}</span>
        </button>
        <span
          class="text-xs text-slate-500 max-w-[160px] truncate hidden sm:inline"
          >{{ authStore.user?.email }}</span
        >
        <button
          class="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/[0.15] rounded-lg transition-colors"
          @click="logout"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Mobile drawer backdrop -->
    <div
      v-if="mobileNavOpen"
      class="sm:hidden fixed inset-0 bg-black/40 z-40"
      @click="mobileNavOpen = false"
    />
    <!-- Mobile drawer sidebar -->
    <nav
      class="sm:hidden fixed inset-y-0 left-0 z-50 w-[240px] flex flex-col bg-white dark:bg-background-dark border-r border-slate-200 dark:border-white/[0.06] py-3 transition-transform duration-200"
      :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-all duration-150"
          :class="
            isActive(link.name)
              ? 'bg-primary/10 text-primary'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
          "
          @click="mobileNavOpen = false"
        >
          <span class="material-symbols-outlined text-[18px]">{{
            link.icon
          }}</span>
          <span>{{ link.label }}</span>
        </RouterLink>
      </div>
      <div class="px-5 py-2 text-[11px] text-slate-400 dark:text-slate-600">
        v1.0
      </div>
    </nav>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <nav
        class="hidden sm:flex w-[200px] flex-shrink-0 bg-slate-50 dark:bg-background-dark border-r border-slate-200 dark:border-white/[0.06] flex-col py-3"
      >
        <div class="flex-1 flex flex-col gap-0.5 px-2">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="{ name: link.name }"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-all duration-150"
            :class="
              isActive(link.name)
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
            "
          >
            <span class="material-symbols-outlined text-[18px]">{{
              link.icon
            }}</span>
            <span>{{ link.label }}</span>
          </RouterLink>
        </div>
        <div class="px-5 py-2 text-[11px] text-slate-400 dark:text-slate-600">
          v1.0
        </div>
      </nav>

      <!-- Content -->
      <main
        class="flex-1 overflow-y-auto p-4 sm:p-7 bg-white dark:bg-background-dark"
      >
        <!-- Active exams info -->
        <div
          v-if="activeExams.length > 0"
          class="mb-5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400"
        >
          <span class="material-symbols-outlined text-[16px] text-primary"
            >quiz</span
          >
          <span class="font-medium"
            >{{ activeExams.length }} exam{{
              activeExams.length > 1 ? 's' : ''
            }}
            currently active</span
          >
        </div>

        <router-view />
      </main>
    </div>
  </div>
</template>
