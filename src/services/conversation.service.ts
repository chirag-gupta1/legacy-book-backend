// src/services/conversation.service.ts
import { LIFE_SECTIONS } from "../data/questions.data";

// Extract valid section names ("childhood" | "education" | "career" | etc.)
export type LifeSection = keyof typeof LIFE_SECTIONS;

export interface ConversationLike {
  currentSection: LifeSection;
  questionIndex: number;
}

/**
 * Returns the next question, automatically advancing through life sections.
 */
export function getNextQuestion(conversation: ConversationLike) {
  const sectionQuestions = LIFE_SECTIONS[conversation.currentSection];

  // If questions left → return current
  if (conversation.questionIndex < sectionQuestions.length) {
    return sectionQuestions[conversation.questionIndex];
  }

  // Move to the next section
  const keys = Object.keys(LIFE_SECTIONS) as LifeSection[];
  const currentIndex = keys.indexOf(conversation.currentSection);
  const nextSection = keys[currentIndex + 1];

  if (!nextSection) return null;

  conversation.currentSection = nextSection;
  conversation.questionIndex = 0;

  return LIFE_SECTIONS[nextSection][0];
}

