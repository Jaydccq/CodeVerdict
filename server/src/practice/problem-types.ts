import type { PracticeLanguageConfig, PracticeLanguageKey } from './languages';

export interface PracticeProblemSample {
  input: string;
  output: string;
  explanation?: string;
}

export interface PracticeProblemMetadata {
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  samples: PracticeProblemSample[];
  supportedLanguages: PracticeLanguageKey[];
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface PracticeProblemTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: 'visible' | 'hidden';
}

export interface PracticeProblem extends PracticeProblemMetadata {
  starterCode: Record<PracticeLanguageKey, string>;
  languageConfigs: PracticeLanguageConfig[];
  visibleTests: PracticeProblemTestCase[];
  hiddenTests: PracticeProblemTestCase[];
}

export interface PracticeProblemListItem {
  slug: string;
  title: string;
  difficulty: PracticeProblemMetadata['difficulty'];
  summary: string;
  supportedLanguages: PracticeLanguageConfig[];
}
