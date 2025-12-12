import openai from "./openai";
interface DecisionLike {
  issueId: string;
  decision: "KEEP" | "REMOVE" | "ANONYMIZE";
}


interface RegenerationInput {
  bookText: string;
  answers: string[];
  decisions: VerificationDecision[];
}

export async function regenerateBook({
  bookText,
  answers,
  decisions,
}: {
  bookText: string;
  answers: string[];
  decisions: DecisionLike[];
}): Promise<string> {
  const constraints = decisions.map(d => {
    if (d.decision === "REMOVE") {
      return `Remove content related to issue ${d.issueId}`;
    }
    if (d.decision === "ANONYMIZE") {
      return `Anonymize names related to issue ${d.issueId}`;
    }
    return null;
  }).filter(Boolean);

  const prompt = `
You are regenerating a biography.

STRICT RULES:
- You MUST follow all constraints exactly.
- You MUST NOT invent new facts.
- You MUST NOT add content not supported by interview answers.
- You MUST preserve tone and structure.

Constraints:
${constraints.join("\n")}

Original Biography:
"""${bookText}"""

Interview Answers:
"""${answers.join("\n")}"""

Return ONLY the regenerated biography text.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content ?? bookText;
}
