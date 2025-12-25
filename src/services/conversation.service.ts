// src/services/conversation.service.ts
import { LIFE_SECTIONS } from "../data/questions.data";

// Extract valid section names ("childhood" | "education" | "career" | etc.)
export type LifeSection = keyof typeof LIFE_SECTIONS;

export interface ConversationLike {
  currentSection: LifeSection;
  questionIndex: number;
}

/**
 * Pure function.
 * Returns the next question for the given section + index.
 * DOES NOT mutate state.
 */
export function getNextQuestion(
  conversation: ConversationLike
): string | null {
  const sectionQuestions = LIFE_SECTIONS[conversation.currentSection];

  // Invalid section or no questions
  if (!sectionQuestions) {
    return null;
  }

  // If index is within this section, return the question
  if (conversation.questionIndex < sectionQuestions.length) {
    return sectionQuestions[conversation.questionIndex] ?? null;
  }

  // Out of range → interview complete (section transitions handled elsewhere)
  return null;
}
