export interface McqOption {
  id: string; // stable UUID, generated once at creation and preserved on edit
  text: string;
  imageData?: string | null;
  isCorrect: boolean; // stripped before sending to students
}

// Student-safe shape - no isCorrect
export type McqOptionPublic = Omit<McqOption, 'isCorrect'>;
