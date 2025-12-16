// src/services/bookVerification.service.ts
import openai from "./openai";
import crypto from "crypto";

function generateIssueId(type: string, message: string): string {
  return crypto
    .createHash("sha256")
    .update(`${type}:${message}`)
    .digest("hex")
    .slice(0, 12);
}

export interface VerificationIssue {
  id: string;
  type: "SENSITIVE" | "INTEGRITY" | "COVERAGE";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface VerificationReport {
  status: "PASS" | "WARN" | "FAIL";
  issues: VerificationIssue[];
}

export async function verifyBookContent(
  bookText: string,
  interviewAnswers: string[]
): Promise<VerificationReport> {
  const prompt = `
You are an AI verifier.

STRICT RULES:
- You MUST NOT rewrite, edit, or improve any text.
- You MUST NOT suggest alternative wording.
- You MUST ONLY analyze and flag issues.

Analyze the following biography and interview answers.

Check for:
1. Sensitive personal content
2. Contradictions or hallucinated facts
3. Missing major life areas

Return ONLY valid JSON in this format:
{
  "status": "PASS | WARN | FAIL",
  "issues": [
    {
      "type": "SENSITIVE | INTEGRITY | COVERAGE",
      "message": "string",
      "severity": "LOW | MEDIUM | HIGH"
    }
  ]
}

Biography:
"""${bookText}"""

Interview Answers:
"""${interviewAnswers.join("\n")}"""
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    return {
      status: "WARN",
      issues: [
        {
          id: "no-content",
          type: "INTEGRITY",
          message: "AI verifier returned no content",
          severity: "LOW",
        },
      ],
    };
  }

  let parsed: Partial<VerificationReport>;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      status: "FAIL",
      issues: [
        {
          id: "invalid-json",
          type: "INTEGRITY",
          message: "AI verifier returned invalid JSON",
          severity: "HIGH",
        },
      ],
    };
  }

  const issues = (parsed.issues ?? []).map(issue => ({
    ...issue,
    id: generateIssueId(issue.type, issue.message),
  }));

  return {
    status: parsed.status ?? "WARN",
    issues,
  };
}
