<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStats } from '../../services/adminApi';
import type { AdminStats } from '../../types/admin';

const router = useRouter();
const stats = ref<AdminStats | null>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    stats.value = await getStats();
  } catch {
    error.value = 'Failed to load stats.';
  } finally {
    loading.value = false;
  }
});

const statCards = (s: AdminStats) => [
  { label: 'Total Exams', value: String(s.totalExams), icon: 'event_note' },
  {
    label: 'Registered Students',
    value: String(s.totalStudents),
    icon: 'group',
  },
  {
    label: 'Total Submissions',
    value: String(s.totalSubmissions),
    icon: 'send',
  },
];

const quickActions = [
  {
    label: 'Create Exam',
    icon: 'add_circle',
    primary: true,
    route: 'admin-exam-create',
  },
  {
    label: 'All Exams',
    icon: 'event_note',
    primary: false,
    route: 'admin-exams',
  },
  {
    label: 'Submissions',
    icon: 'send',
    primary: false,
    route: 'admin-submissions',
  },
  {
    label: 'Run Logs',
    icon: 'terminal',
    primary: false,
    route: 'admin-run-logs',
  },
  { label: 'Users', icon: 'group', primary: false, route: 'admin-users' },
];
</script>

<template>
  <div class="dashboard">
    <!-- Page title -->
    <div class="page-header">
      <h2 class="page-title">Dashboard</h2>
      <p class="page-sub">Platform overview and quick actions</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span class="spinner" />
      <span>Loading stats…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <span class="material-symbols-outlined">error</span>
      {{ error }}
    </div>

    <template v-else-if="stats">
      <!-- Active exams banner -->
      <div
        v-for="exam in stats.activeExams"
        :key="exam.id"
        class="active-exam-banner"
      >
        <div class="active-exam-left">
          <span class="live-dot" />
          <div>
            <div class="active-exam-label">Live Exam</div>
            <div class="active-exam-title">{{ exam.title }}</div>
          </div>
        </div>
        <button
          class="leaderboard-btn"
          @click="
            router.push({
              name: 'admin-leaderboard',
              params: { examId: exam.id },
            })
          "
        >
          <span class="material-symbols-outlined text-[15px]">leaderboard</span>
          Leaderboard
        </button>
      </div>

      <!-- Stat cards -->
      <div class="stats-grid">
        <div
          v-for="card in statCards(stats)"
          :key="card.label"
          class="stat-card"
        >
          <div class="stat-icon-wrap">
            <span class="material-symbols-outlined stat-icon">{{
              card.icon
            }}</span>
          </div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </div>
      </div>

      <!-- Section divider -->
      <div class="section-divider">
        <span class="section-label">Quick Actions</span>
      </div>

      <!-- Quick actions -->
      <div class="actions-grid">
        <button
          v-for="action in quickActions"
          :key="action.route"
          class="action-btn"
          :class="action.primary ? 'action-primary' : 'action-ghost'"
          @click="router.push({ name: action.route })"
        >
          <span class="material-symbols-outlined text-[17px]">{{
            action.icon
          }}</span>
          {{ action.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: 'Figtree', sans-serif;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}
.page-sub {
  font-size: 13px;
  color: var(--text-muted);
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
  padding: 32px 0;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-top-color: rgb(var(--color-primary));
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error */
.error-state {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.07);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 10px;
  padding: 12px 16px;
}

/* Active exam banner */
.active-exam-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgb(var(--color-accent) / 0.06);
  border: 1px solid rgb(var(--color-accent) / 0.2);
  border-radius: 12px;
  padding: 14px 18px;
}
.active-exam-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.live-dot {
  width: 8px;
  height: 8px;
  background: rgb(var(--color-accent));
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgb(var(--color-accent) / 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgb(var(--color-accent) / 0.07);
  }
}
.active-exam-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-accent));
  margin-bottom: 2px;
}
.active-exam-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.leaderboard-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Figtree', sans-serif;
  color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.08);
  border: 1px solid rgb(var(--color-accent) / 0.25);
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.leaderboard-btn:hover {
  background: rgb(var(--color-accent) / 0.14);
  border-color: rgb(var(--color-accent) / 0.4);
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.stat-card:hover {
  border-color: rgb(var(--color-primary) / 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}
.stat-icon-wrap {
  width: 36px;
  height: 36px;
  background: rgb(var(--color-primary) / 0.08);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.stat-icon {
  font-size: 18px;
  color: rgb(var(--color-primary));
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

/* Section divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
}
.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}
.section-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Quick actions */
.actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Figtree', sans-serif;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  transition:
    background 0.15s,
    box-shadow 0.15s;
}
.action-primary {
  background: rgb(var(--color-primary));
  color: #fff;
  box-shadow: 0 3px 12px rgb(var(--color-primary) / 0.3);
}
.action-primary:hover {
  background: color-mix(in srgb, rgb(var(--color-primary)) 85%, black);
  box-shadow: 0 4px 20px rgb(var(--color-primary) / 0.45);
}
.action-ghost {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.action-ghost:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
