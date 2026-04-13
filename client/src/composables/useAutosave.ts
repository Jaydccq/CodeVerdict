import { ref, watch, onUnmounted } from 'vue';
import { useEditorStore } from '../stores/editor';
import { useAuthStore } from '../stores/auth';
import { useExamStore } from '../stores/exam';
import api from '../services/api';

const DEBOUNCE_MS = 500;
const SERVER_SYNC_MS = 30_000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Fetch the server-saved autosave for the active exam and prime
 * both the editor store and sessionStorage. Safe to call outside
 * component setup (e.g. after login).
 */
export async function prefetchAutosave() {
  const editorStore = useEditorStore();
  const examStore = useExamStore();

  if (!examStore.activeExam) {
    await examStore.fetchActiveExam();
  }
  if (!examStore.activeExam) return;

  try {
    const { data } = await api.get<{ codeState?: Record<string, string> }>(
      `/autosave/${examStore.activeExam.id}`,
    );
    if (data?.codeState && typeof data.codeState === 'object') {
      editorStore.restoreCodeState(data.codeState);
      const key = `exam_code_state_${examStore.activeExam.id}`;
      sessionStorage.setItem(key, JSON.stringify(data.codeState));
    }
  } catch (e) {
    console.warn('[autosave] prefetch failed', e);
  }
}

export function useAutosave() {
  const editorStore = useEditorStore();
  const authStore = useAuthStore();
  const examStore = useExamStore();

  const saveStatus = ref<SaveStatus>('idle');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let syncInterval: ReturnType<typeof setInterval> | null = null;
  let savedResetTimer: ReturnType<typeof setTimeout> | null = null;

  function storageKey(): string {
    const examId = examStore.activeExam?.id ?? 'none';
    return `exam_code_state_${examId}`;
  }

  function saveToSession() {
    sessionStorage.setItem(
      storageKey(),
      JSON.stringify(editorStore.getCodeState()),
    );
  }

  async function syncToServer() {
    if (!authStore.isAuthenticated || !examStore.activeExam) return;
    const state = editorStore.getCodeState();
    if (Object.keys(state).length === 0) return;

    saveStatus.value = 'saving';
    try {
      await api.post(`/autosave/${examStore.activeExam.id}`, {
        codeState: state,
      });
      saveStatus.value = 'saved';
      if (savedResetTimer) clearTimeout(savedResetTimer);
      savedResetTimer = setTimeout(() => {
        saveStatus.value = 'idle';
      }, 3000);
    } catch (e) {
      console.warn('[autosave] Failed to sync to server', e);
      saveStatus.value = 'error';
    }
  }

  async function restoreFromServer() {
    if (!authStore.isAuthenticated || !examStore.activeExam) return;
    try {
      const { data } = await api.get<{ codeState?: Record<string, string> }>(
        `/autosave/${examStore.activeExam.id}`,
      );
      if (data?.codeState && typeof data.codeState === 'object') {
        editorStore.restoreCodeState(data.codeState);
        saveToSession();
      }
    } catch (e) {
      console.warn('[autosave] Failed to restore from server', e);
    }
  }

  const stopWatch = watch(
    () => editorStore.getCodeState(),
    () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(saveToSession, DEBOUNCE_MS);
    },
    { deep: true },
  );

  async function start() {
    await restoreFromServer();
    syncInterval = setInterval(syncToServer, SERVER_SYNC_MS);
  }

  function stop() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (syncInterval) clearInterval(syncInterval);
    if (savedResetTimer) clearTimeout(savedResetTimer);
    stopWatch();
  }

  async function forceSave() {
    saveToSession();
    await syncToServer();
  }

  onUnmounted(stop);

  return {
    start,
    stop,
    syncToServer,
    restoreFromServer,
    forceSave,
    saveStatus,
  };
}
