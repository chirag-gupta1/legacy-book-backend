// src/services/aiAnalysis.service.ts
import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";
let client: OpenAI | null = null;
if (OPENAI_KEY) {
  client = new OpenAI({ apiKey: OPENAI_KEY });
}

/** Simple fallback analyzer used in development or if OpenAI fails */
function fallbackAnalyze(question: string, answer: string) {
  const tags: string[] = [];
  const text = (answer || "").toLowerCase();

  if (text.includes("father") || text.includes("mother") || text.includes("family")) tags.push("family");
  if (text.includes("work") || text.includes("job") || text.includes("career")) tags.push("career");
  if (text.includes("struggl") || text.includes("hard") || text.includes("difficult")) tags.push("hardship");
  if (text.includes("proud") || text.includes("achievement")) tags.push("achievement");

  const importanceScore = Math.min(5, 1 + Math.floor((answer?.length ?? 0) / 250) + (tags.length > 0 ? 1 : 0));

  let followUp: string | null = null;
  if (tags.includes("family")) followUp = "Can you tell me a specific memory involving that family member?";
  else if (tags.includes("hardship")) followUp = "How did you cope with that period in your life?";
  else if ((answer?.length ?? 0) > 300) followUp = "That's very detailed — can you tell me why this memory stands out?";

  return {
    importanceScore,
    tags,
    followUpQuestion: followUp,
  };
}

export interface AIAnalysisResult {
  importanceScore: number;
  tags: string[];
  followUpQuestion?: string | null;
}

/**
 * Analyze an answer using OpenAI (if available). Returns a structured result.
 * Falls back to a simple rule-based analyzer if no key / error occurs.
 */
export async function analyzeAnswerWithAI(question: string, answer: string): Promise<AIAnalysisResult> {
  // quick guard
  if (!answer) return fallbackAnalyze(question, answer) as AIAnalysisResult;

  // If no API key, use fallback to continue development
  if (!client) {
    return fallbackAnalyze(question, answer) as AIAnalysisResult;
  }

  const systemPrompt = `
You are an empathetic life interviewer.

Given:
Question: "${question}"
Answer: "${answer}"

Return JSON only with:
- importanceScore (1-5)
- tags (array of 1-3 short keywords)
- followUpQuestion (null or a thoughtful single question)

Rules:
- Be respectful
- Do not repeat the same question
- Follow-up must deepen the story
`;

  try {
    // Use the chat completions call and keep the response small
    const resp = await Promise.race([
  client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: systemPrompt }],
    temperature: 0.35,
    max_completion_tokens: 200,
  } as any),

  new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("OpenAI timeout")),
      8_000 // 8 seconds hard cap
    )
  ),
]);


    // Safely extract textual content from many possible SDK shapes
    let rawText: string | undefined;
    if ((resp as any)?.choices?.[0]?.message?.content) rawText = (resp as any).choices[0].message.content;
    if (!rawText && (resp as any)?.choices?.[0]?.text) rawText = (resp as any).choices[0].text;
    if (!rawText && (resp as any)?.output?.[0]?.content) {
      const out = (resp as any).output[0].content;
      if (typeof out === "string") rawText = out;
      else if (Array.isArray(out) && typeof out[0] === "string") rawText = out[0];
      else if (Array.isArray(out) && out[0]?.text) rawText = out[0].text;
    }

    if (!rawText) {
      // Fallback if we couldn't parse a string
      return fallbackAnalyze(question, answer) as AIAnalysisResult;
    }

    // Remove ```json fences if present
    const trimmed = rawText.trim();
    const withoutFence = trimmed.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();

    // Try to parse JSON
    let parsed: any = null;
    try {
      parsed = JSON.parse(withoutFence);
    } catch {
      // try to extract JSON substring
      const match = withoutFence.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed) return fallbackAnalyze(question, answer) as AIAnalysisResult;

    const importanceScore = Math.max(1, Math.min(5, Number(parsed.importanceScore) || 1));
    const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3).map(String) : [];
    const followUpQuestion = parsed.followUpQuestion ?? parsed.follow_up_question ?? null;

    return {
      importanceScore,
      tags,
      followUpQuestion,
    };
  } catch (err) {
    console.error("AI analysis error:", (err as any)?.message ?? err);
    return fallbackAnalyze(question, answer) as AIAnalysisResult;
  }
}
