export function analyzeAnswer(response: string) {
  let importanceScore = 1;
  const tags: string[] = [];

  if (response.length > 200) importanceScore++;
  if (response.toLowerCase().includes("father")) tags.push("family");
  if (response.toLowerCase().includes("mother")) tags.push("family");
  if (response.toLowerCase().includes("struggle")) tags.push("hardship");
  if (response.toLowerCase().includes("proud")) tags.push("achievement");

  if (tags.length > 0) importanceScore++;

  return { importanceScore, tags };
}
