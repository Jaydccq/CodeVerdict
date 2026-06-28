import { createRouter, createWebHistory } from 'vue-router';
import PracticeProblemListView from '../views/PracticeProblemListView.vue';
import PracticeWorkspaceView from '../views/PracticeWorkspaceView.vue';
import { useAuthStore } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAdmin?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Welcome / Landing ──────────────────────────────────────────────────────
    {
      path: '/',
      name: 'practice-home',
      component: PracticeProblemListView,
    },
    {
      path: '/problems/:slug',
      name: 'practice-problem',
      component: PracticeWorkspaceView,
    },

    // ── Student Workspace ────────────────────────────────────────────────────
    {
      path: '/exam/:id/workspace',
      name: 'workspace',
      redirect: { name: 'practice-home' },
    },

    // ── Admin Login (standalone, no layout) ────────────────────────────────────
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/AdminLogin.vue'),
    },

    // ── Admin (nested under AdminLayout) ──────────────────────────────────────
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: { name: 'admin-dashboard' },
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('../views/admin/Dashboard.vue'),
        },
        {
          path: 'exams',
          name: 'admin-exams',
          component: () => import('../views/admin/ExamList.vue'),
        },
        {
          path: 'exams/new',
          name: 'admin-exam-create',
          component: () => import('../views/admin/ExamForm.vue'),
        },
        {
          path: 'exams/:id',
          name: 'admin-exam-edit',
          component: () => import('../views/admin/ExamForm.vue'),
        },
        {
          path: 'exams/:examId/problems',
          name: 'admin-problems',
          component: () => import('../views/admin/ProblemList.vue'),
        },
        {
          path: 'exams/:examId/problems/new',
          name: 'admin-problem-create',
          component: () => import('../views/admin/ProblemForm.vue'),
        },
        {
          path: 'exams/:examId/problems/:id',
          name: 'admin-problem-edit',
          component: () => import('../views/admin/ProblemForm.vue'),
        },
        {
          path: 'exams/:examId/leaderboard',
          name: 'admin-leaderboard',
          component: () => import('../views/admin/Leaderboard.vue'),
        },
        // --- Standalone Problems ---
        {
          path: 'all-problems',
          name: 'admin-all-problems',
          component: () => import('../views/admin/AllProblemList.vue'),
        },
        {
          path: 'all-problems/new',
          name: 'admin-all-problem-create',
          component: () => import('../views/admin/AllProblemForm.vue'),
        },
        {
          path: 'all-problems/:id',
          name: 'admin-all-problem-edit',
          component: () => import('../views/admin/AllProblemForm.vue'),
        },
        // --- Standalone Test Cases ---
        {
          path: 'testcases',
          name: 'admin-testcases',
          component: () => import('../views/admin/TestCaseList.vue'),
        },
        {
          path: 'testcases/new',
          name: 'admin-testcase-create',
          component: () => import('../views/admin/TestCaseForm.vue'),
        },
        {
          path: 'testcases/:id',
          name: 'admin-testcase-edit',
          component: () => import('../views/admin/TestCaseForm.vue'),
        },
        // --- Users ---
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('../views/admin/UserList.vue'),
        },
        {
          path: 'users/new',
          name: 'admin-user-create',
          component: () => import('../views/admin/UserForm.vue'),
        },
        {
          path: 'users/:id',
          name: 'admin-user-edit',
          component: () => import('../views/admin/UserForm.vue'),
        },
        // --- Submissions ---
        {
          path: 'submissions',
          name: 'admin-submissions',
          component: () => import('../views/admin/SubmissionList.vue'),
        },
        {
          path: 'submissions/:id',
          name: 'admin-submission-view',
          component: () => import('../views/admin/SubmissionView.vue'),
        },
        // --- Scores ---
        {
          path: 'scores',
          name: 'admin-scores',
          component: () => import('../views/admin/ScoreList.vue'),
        },
        {
          path: 'scores/new',
          name: 'admin-score-create',
          component: () => import('../views/admin/ScoreForm.vue'),
        },
        {
          path: 'scores/detail/:examId/:userId',
          name: 'admin-score-detail',
          component: () => import('../views/admin/ScoreDetail.vue'),
        },
        {
          path: 'scores/:id',
          name: 'admin-score-edit',
          component: () => import('../views/admin/ScoreForm.vue'),
        },
        // --- AutoSave ---
        {
          path: 'autosaves',
          name: 'admin-autosaves',
          component: () => import('../views/admin/AutoSaveList.vue'),
        },
        {
          path: 'autosaves/:id',
          name: 'admin-autosave-view',
          component: () => import('../views/admin/AutoSaveView.vue'),
        },
        // --- Run Logs ---
        {
          path: 'run-logs',
          name: 'admin-run-logs',
          component: () => import('../views/admin/RunLogList.vue'),
        },
        // --- Problem Views ---
        {
          path: 'problem-views',
          name: 'admin-problem-views',
          component: () => import('../views/admin/ProblemViewList.vue'),
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin);
  if (!requiresAdmin) return;

  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) {
    return { name: 'admin-login' };
  }
  // user is never persisted to sessionStorage, only the token is.
  // If user is null (e.g. fresh reload with a stale token), we cannot
  // verify the role - redirect to login to force re-authentication.
  if (!authStore.user) {
    return { name: 'admin-login' };
  }
  if (authStore.user.role !== 'ADMIN') {
    return { name: 'practice-home' };
  }
});

export default router;
