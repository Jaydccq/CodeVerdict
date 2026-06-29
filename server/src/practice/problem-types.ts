import type { PracticeLanguageConfig, PracticeLanguageKey } from './languages';

export type PracticeQuestionType = 'algorithm' | 'debug-workspace';

export interface PracticeProblemSample {
  input: string;
  output: string;
  explanation?: string;
}

export interface PracticeDebugWorkspaceManifest {
  stack: 'node';
  runnerProfile?: string;
  entryFiles: string[];
  editablePaths: string[];
  visibleTestScript: string;
  submitTestScript: string;
}

export interface PracticeDebugWorkspaceFile {
  path: string;
  content: string;
  editable: boolean;
}

export interface PracticeDebugWorkspace {
  stack: 'node';
  runnerProfile: string;
  entryFiles: string[];
  editablePaths: string[];
  files: PracticeDebugWorkspaceFile[];
  manifest: PracticeDebugWorkspaceManifest;
  seedDir: string;
}

export interface PracticeProblemMetadata {
  slug: string;
  source?: string;
  questionType: PracticeQuestionType;
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
  editorial?: string;
  starterCode: Record<PracticeLanguageKey, string>;
  languageConfigs: PracticeLanguageConfig[];
  visibleTests: PracticeProblemTestCase[];
  hiddenTests: PracticeProblemTestCase[];
  debugWorkspace?: PracticeDebugWorkspace;
}

export interface PracticeProblemListItem {
  slug: string;
  questionType: PracticeQuestionType;
  title: string;
  difficulty: PracticeProblemMetadata['difficulty'];
  summary: string;
  supportedLanguages: PracticeLanguageConfig[];
}
