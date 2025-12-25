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

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5.2",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
    });

    return completion.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    // 🔒 FAIL-SOFT FALLBACK (DEV / NO-CREDITS SAFE)
    console.error("generateChapter failed — using fallback", err);

    return `
[Draft generation unavailable]

This draft could not be fully generated due to AI service unavailability.

The following interview responses were recorded and will be used once generation is available:

${answers.map((a, i) => `${i + 1}. ${a.response}`).join("\n")}

(Full narrative generation will resume when AI access is restored.)
`.trim();
  }
}