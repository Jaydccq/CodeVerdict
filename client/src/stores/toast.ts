import { defineStore } from 'pinia';
import { ref } from 'vue';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
  duration: number;
}

let nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([]);

  function add(type: ToastType, text: string, duration = 6000) {
    const id = nextId++;
    toasts.value.push({ id, type, text, duration });
    setTimeout(() => remove(id), duration);
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, add, remove };
});
