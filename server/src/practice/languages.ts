export type PracticeLanguageKey =
  | 'python'
  | 'javascript'
  | 'cpp'
  | 'java'
  | 'c';

export interface PracticeLanguageConfig {
  key: PracticeLanguageKey;
  label: string;
  languageId: number;
  monacoLanguage: string;
  starterFile: string;
}

export const PRACTICE_LANGUAGES: Record<
  PracticeLanguageKey,
  PracticeLanguageConfig
> = {
  python: {
    key: 'python',
    label: 'Python',
    languageId: 113,
    monacoLanguage: 'python',
    starterFile: 'python.py',
  },
  javascript: {
    key: 'javascript',
    label: 'JavaScript',
    languageId: 102,
    monacoLanguage: 'javascript',
    starterFile: 'javascript.js',
  },
  cpp: {
    key: 'cpp',
    label: 'C++',
    languageId: 105,
    monacoLanguage: 'cpp',
    starterFile: 'cpp.cpp',
  },
  java: {
    key: 'java',
    label: 'Java',
    languageId: 91,
    monacoLanguage: 'java',
    starterFile: 'java.java',
  },
  c: {
    key: 'c',
    label: 'C',
    languageId: 103,
    monacoLanguage: 'c',
    starterFile: 'c.c',
  },
};

export const PRACTICE_LANGUAGE_KEYS = Object.keys(
  PRACTICE_LANGUAGES,
) as PracticeLanguageKey[];

export function getPracticeLanguage(key: string): PracticeLanguageConfig | null {
  return PRACTICE_LANGUAGES[key as PracticeLanguageKey] ?? null;
}
