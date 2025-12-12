export interface Answer {
  question: string;
  response: string;
  tags?: string[];
  importanceScore?: number;
}

export interface Conversation {
  id: string;
  currentSection: string;
  questionIndex: number;
  pendingFollowUp?: string | null;
  answers: Answer[];
}