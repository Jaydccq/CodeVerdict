import { ref, watch } from 'vue';

export type Theme = 'dark' | 'light';

const LS_KEY = 'theme';

const stored = localStorage.getItem(LS_KEY) as Theme | null;
const theme = ref<Theme>(stored || 'dark');

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

// Apply on load
applyTheme(theme.value);

watch(theme, (t) => {
  applyTheme(t);
  localStorage.setItem(LS_KEY, t);
});

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  function setTheme(t: Theme) {
    theme.value = t;
  }

  return { theme, toggleTheme, setTheme };
}
