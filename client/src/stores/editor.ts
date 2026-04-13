import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LanguageConfig, Problem } from '../types';
import { LANGUAGE_NAMES } from '../data/languages';
import api from '../services/api';

// Mapping from language name to Monaco language ID and boilerplate
const LANG_META: Record<string, { monacoLang: string; boilerplate: string }> = {
  python: {
    monacoLang: 'python',
    boilerplate: `import sys

def solve():
    # Read input
    line = input()
    # Your solution here
    print(line)

solve()
`,
  },
  'c++': {
    monacoLang: 'cpp',
    boilerplate: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Your solution here

    return 0;
}
`,
  },
  c: {
    monacoLang: 'c',
    boilerplate: `#include <stdio.h>

int main() {
    // Your solution here

    return 0;
}
`,
  },
  java: {
    monacoLang: 'java',
    boilerplate: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your solution here
        sc.close();
    }
}
`,
  },
  javascript: {
    monacoLang: 'javascript',
    boilerplate: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    // Your solution here
    console.log(lines[0]);
});
`,
  },
};

const DEFAULT_META = {
  monacoLang: 'plaintext',
  boilerplate: '// Your solution here\n',
};

/** Strip version qualifier to find the base language name for LANG_META lookup */
function baseLangName(name: string): string {
  return name.replace(/\s*\(.*\)$/, '').toLowerCase();
}

/** Build a LanguageConfig from an API language entry { id, name, version? } */
export function toLangConfig(entry: {
  id: number;
  name: string;
}): LanguageConfig {
  const meta = LANG_META[baseLangName(entry.name)] ?? DEFAULT_META;
  return { id: entry.id, name: entry.name, ...meta };
}

// Preferred default language ID: C (GCC 14.1.0)
const DEFAULT_LANGUAGE_ID = 103;

// Fallback languages used before the API is called
const FALLBACK_LANGUAGES: LanguageConfig[] = Object.entries(LANGUAGE_NAMES).map(
  ([id, name]) => toLangConfig({ id: Number(id), name }),
);

// Restore languages from localStorage if available
function loadCachedLanguages(): { langs: LanguageConfig[]; ready: boolean } {
  try {
    const raw = localStorage.getItem('cachedLanguages');
    if (raw) {
      const parsed = JSON.parse(raw) as { id: number; name: string }[];
      if (parsed.length > 0)
        return { langs: parsed.map(toLangConfig), ready: true };
    }
  } catch (e) {
    console.warn('[editor] Failed to load cached languages', e);
  }
  return { langs: FALLBACK_LANGUAGES, ready: false };
}

function currentExamId(): number | null {
  try {
    const raw = localStorage.getItem('cachedActiveExam');
    return raw ? (JSON.parse(raw) as { id: number }).id : null;
  } catch (e) {
    console.warn('[editor] Failed to read cached exam ID', e);
    return null;
  }
}

function loadCachedActiveProblemId(): number | null {
  try {
    const raw = localStorage.getItem('activeProblemId');
    if (!raw) return null;
    const stored = JSON.parse(raw) as { examId: number | null; id: number };
    if (stored.examId !== currentExamId()) return null;
    return stored.id;
  } catch (e) {
    console.warn('[editor] Failed to load cached active problem', e);
    return null;
  }
}

export const useEditorStore = defineStore('editor', () => {
  const cached = loadCachedLanguages();
  const languages = ref<LanguageConfig[]>(cached.langs);
  const language = ref<LanguageConfig>(
    cached.langs.find((l) => l.id === DEFAULT_LANGUAGE_ID) ?? cached.langs[0],
  );
  const codeMap = ref<Record<string, string>>({});
  const languagesReady = ref(cached.ready);

  const activeProblemId = ref<number | null>(loadCachedActiveProblemId());
  const activeMcqSection = ref(false);
  // Full problem object for starter code lookup - not persisted (starterCode can be large)
  const activeProblem = ref<Problem | null>(null);

  const codeKey = computed(
    () => `${activeProblemId.value ?? 'scratch'}_${language.value.id}`,
  );

  /**
   * Fallback chain for code content:
   *   1. User-typed code saved in codeMap
   *   2. Starter code for the current language from the active problem
   *   3. Language boilerplate
   */
  const code = computed({
    get: () => {
      const saved = codeMap.value[codeKey.value];
      if (saved !== undefined) return saved;
      const starter =
        activeProblem.value?.starterCode?.[String(language.value.id)];
      return starter ?? language.value.boilerplate;
    },
    set: (val: string) => {
      codeMap.value[codeKey.value] = val;
    },
  });

  function setLanguagesReady() {
    languagesReady.value = true;
  }

  function setLanguages(apiLangs: { id: number; name: string }[]) {
    const configs = apiLangs.map(toLangConfig);
    if (configs.length > 0) {
      languages.value = configs;
      if (!configs.find((l) => l.id === language.value.id)) {
        language.value =
          configs.find((l) => l.id === DEFAULT_LANGUAGE_ID) ?? configs[0];
      }
      languagesReady.value = true;
      localStorage.setItem('cachedLanguages', JSON.stringify(apiLangs));
    }
  }

  let _langFetch: Promise<void> | null = null;

  function fetchLanguages(): Promise<void> {
    if (languagesReady.value) return Promise.resolve();
    if (_langFetch) return _langFetch;
    _langFetch = api
      .get<{ id: number; name: string }[]>('/languages')
      .then(({ data }) => {
        setLanguages(data);
      })
      .catch((e) => {
        console.warn('[editor] Failed to fetch languages', e);
      })
      .finally(() => {
        _langFetch = null;
      });
    return _langFetch;
  }

  function setLanguage(lang: LanguageConfig) {
    language.value = lang;
  }

  function setActiveProblem(id: number | null, problem?: Problem | null) {
    activeProblemId.value = id;
    activeProblem.value = problem ?? null;
    activeMcqSection.value = false;
    if (id !== null) {
      localStorage.setItem(
        'activeProblemId',
        JSON.stringify({ examId: currentExamId(), id }),
      );
    } else {
      localStorage.removeItem('activeProblemId');
    }
  }

  function setActiveMcqSection(val: boolean) {
    activeMcqSection.value = val;
    if (val) {
      activeProblemId.value = null;
      activeProblem.value = null;
      localStorage.removeItem('activeProblemId');
    }
  }

  /** Reset code for the current problem+language to starter code (if set) or boilerplate. */
  function resetCode() {
    const starter =
      activeProblem.value?.starterCode?.[String(language.value.id)];
    codeMap.value[codeKey.value] = starter ?? language.value.boilerplate;
  }

  function getCodeState(): Record<string, string> {
    return { ...codeMap.value };
  }

  function restoreCodeState(state: Record<string, string>) {
    codeMap.value = { ...state };
  }

  return {
    language,
    languages,
    code,
    codeMap,
    activeProblemId,
    activeProblem,
    activeMcqSection,
    languagesReady,
    setLanguage,
    setLanguages,
    fetchLanguages,
    setActiveProblem,
    setActiveMcqSection,
    setLanguagesReady,
    resetCode,
    getCodeState,
    restoreCodeState,
  };
});
