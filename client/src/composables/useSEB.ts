import { ref } from 'vue';

declare global {
  interface Window {
    SafeExamBrowser?: {
      security?: unknown;
    };
  }
}

export function useSEB() {
  const isSEB = ref(!!window.SafeExamBrowser?.security);

  return { isSEB };
}
