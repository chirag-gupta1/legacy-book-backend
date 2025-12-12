// src/services/book.service.ts
import client from "./openai";
interface AnswerLike {
  response: string;
}


export async function generateChapter(answers: Answer[]): Promise<string> {
  const summary = answers
    .map(a =>
      `Q: ${a.question}\nA: ${a.response}\nFollow-up: ${a.followUp ?? "None"}`
    )
    .join("\n\n");

  const prompt = `
Write a 6-10 page biography-style chapter based on these interview notes:

${summary}

Tone guidelines:
- Warm
- Narrative
- Reflective
- Professional biography style

Return plain text only.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
  });

  const choice = completion.choices?.[0];
  const message = choice?.message?.content;

  return message ?? ""; // if undefined, return safe empty string
}
