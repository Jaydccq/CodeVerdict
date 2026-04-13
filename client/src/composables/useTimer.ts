import { ref, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useExamStore } from '../stores/exam';
import type { ExamStatus } from '../types';

export function useTimer() {
  const examStore = useExamStore();
  const remaining = ref('--:--:--');
  const isWarning = ref(false);
  const isCritical = ref(false);
  const isExpired = ref(false);

  let endTime: number | null = null;
  let drift = 0;
  let tickInterval: ReturnType<typeof setInterval> | null = null;
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  async function sync() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) return;
    const id = examStore.activeExam?.id;
    if (!id) return;

    try {
      const { data } = await api.get<ExamStatus>(`/exams/${id}/status`);
      drift = dayjs(data.serverTime).valueOf() - Date.now();
      endTime = dayjs(data.examEndTime).valueOf();
    } catch (e) {
      console.warn('[timer] Failed to sync time', e);
    }
  }

  function tick() {
    if (endTime === null) return;

    const now = Date.now() + drift;
    const diff = endTime - now;

    if (diff <= 0) {
      remaining.value = "Time's Up";
      isExpired.value = true;
      isWarning.value = false;
      isCritical.value = false;
      stop();
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    remaining.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const mins = diff / 60000;
    isCritical.value = mins < 5;
    isWarning.value = mins < 15 && !isCritical.value;
  }

  async function start() {
    await sync();
    // Fallback: if sync couldn't set endTime (unauthenticated or network error),
    // derive it from the exam store so the timer never stays at '--:--:--'.
    if (endTime === null && examStore.activeExam?.endTime) {
      endTime = dayjs(examStore.activeExam.endTime).valueOf();
    }
    tick(); // show real countdown immediately instead of waiting 1s for first interval
    tickInterval = setInterval(tick, 1000);
    syncInterval = setInterval(sync, 5 * 60 * 1000);
  }

  function stop() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    endTime = null;
    drift = 0;
  }

  onUnmounted(stop);

  return { remaining, isWarning, isCritical, isExpired, start, stop, sync };
}
