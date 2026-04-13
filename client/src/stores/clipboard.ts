import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ClipboardEntry {
  text: string;
  copiedAt: Date;
}

const MAX_ENTRIES = 5;
const LOCK_KEY = 'clipboard_locked';

export const useClipboardStore = defineStore('clipboard', () => {
  const history = ref<ClipboardEntry[]>([]);
  const lockedText = ref<string | null>(localStorage.getItem(LOCK_KEY));

  function push(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Never evict the locked entry
    history.value = history.value.filter((e) => e.text !== trimmed);
    history.value.unshift({ text: trimmed, copiedAt: new Date() });
    // Trim to MAX_ENTRIES but keep locked entry if it would be pushed out
    if (history.value.length > MAX_ENTRIES) {
      const sliced = history.value.slice(0, MAX_ENTRIES);
      if (
        lockedText.value &&
        !sliced.find((e) => e.text === lockedText.value)
      ) {
        const locked = history.value.find((e) => e.text === lockedText.value);
        if (locked) sliced[MAX_ENTRIES - 1] = locked;
      }
      history.value = sliced;
    }
  }

  function lock(text: string) {
    lockedText.value = text;
    localStorage.setItem(LOCK_KEY, text);
  }

  function unlock() {
    lockedText.value = null;
    localStorage.removeItem(LOCK_KEY);
  }

  function toggleLock(text: string) {
    if (lockedText.value === text) unlock();
    else lock(text);
  }

  function clear() {
    // Keep locked entry in history if one exists
    if (lockedText.value) {
      history.value = history.value.filter((e) => e.text === lockedText.value);
    } else {
      history.value = [];
    }
  }

  return { history, lockedText, push, lock, unlock, toggleLock, clear };
});
