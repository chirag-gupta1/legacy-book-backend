import openai from "./openai";

interface DecisionLike {
  issueId: string;
  decision: "KEEP" | "REMOVE" | "ANONYMIZE";
}

interface RegenerationInput {
  bookText: string;
  answers: string[];
  decisions: DecisionLike[];
}

export async function regenerateBook({
  bookText,
  answers,
  decisions,
}: RegenerationInput): Promise<string> {
  const constraints = decisions
    .map(d => {
      if (d.decision === "REMOVE") {
        return `Remove content related to issue ${d.issueId}`;
      }
      if (d.decision === "ANONYMIZE") {
        return `Anonymize identifiers related to issue ${d.issueId}`;
      }
      return null;
    })
    .filter(Boolean);

  const prompt = `
You are regenerating a biography.

STRICT RULES:
- Follow constraints exactly
- Do not invent facts
- Do not add content beyond interview answers

Constraints:
${constraints.join("\n")}

Original Biography:
"""${bookText}"""

Interview Answers:
"""${answers.join("\n")}"""

Return ONLY the regenerated biography text.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content ?? bookText;
}
