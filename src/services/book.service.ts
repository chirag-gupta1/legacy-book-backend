// src/services/book.service.ts
import client from "./openai";

export interface AnswerLike {
  question?: string;
  response: string;
  followUp?: string | null;
}

/**
 * Generates a biography-style chapter from interview answers.
 *
 * Accepts:
 * - Full AnswerLike[] (question + response + followUp)
 * - OR minimal objects with just { response }
 *
 * This keeps routes flexible and avoids DB coupling.
 */
export async function generateChapter(
  answers: AnswerLike[]
): Promise<string> {
  if (!answers.length) {
    return "";
  }

  const summary = answers
    .map((a, index) => {
      const questionPart = a.question
        ? `Q: ${a.question}\n`
        : `Q${index + 1}:\n`;

      const followUpPart =
        a.followUp !== undefined
          ? `\nFollow-up: ${a.followUp ?? "None"}`
          : "";

      return `${questionPart}A: ${a.response}${followUpPart}`;
    })
    .join("\n\n");

  const prompt = `
Write a 6–10 page biography-style chapter based on these interview notes.

Interview notes:
${summary}

Tone guidelines:
- Warm
- Narrative
- Reflective
- Professional biography style

Rules:
- Do NOT invent facts
- Do NOT add information not present in the notes
- Return plain text only
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
  });

  return completion.choices?.[0]?.message?.content ?? "";
}
