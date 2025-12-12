import { Answer } from "../models/conversation.model";

export function generateFollowUp(answer: Answer): string | null {
  if (answer.importanceScore && answer.importanceScore >= 3) {
    if (answer.tags?.includes("family")) {
      return "Can you tell me more about how this person influenced your life?";
    }

    if (answer.tags?.includes("hardship")) {
      return "How did this experience change you as a person?";
    }

    if (answer.tags?.includes("achievement")) {
      return "Why was this moment especially meaningful to you?";
    }
  }

  return null;
}
