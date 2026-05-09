import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const MAX_SAMPLE_DOCS = 15;

// Common words to ignore when scoring relevance
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "this", "that", "these", "those", "i", "my",
  "we", "our", "you", "your", "they", "their", "it", "its", "as", "not",
  "also", "all", "more", "their", "than", "into", "through", "during",
  "including", "within", "across", "well", "both", "each", "which", "who",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function scoreRelevance(doc: string, keywords: Set<string>): number {
  const docWords = extractKeywords(doc);
  let score = 0;
  for (const kw of keywords) {
    if (docWords.has(kw)) score++;
    // Bonus: if the keyword appears multiple times in the raw doc
    const count = (doc.toLowerCase().match(new RegExp(kw, "g")) || []).length;
    if (count > 1) score += Math.min(count - 1, 3); // cap bonus at 3
  }
  return score;
}

function selectRelevantDocs(
  docs: { type: string; content: string }[],
  jobDesc: string,
  jobTitle: string,
  max: number
): { type: string; content: string }[] {
  const query = `${jobTitle} ${jobDesc}`;
  const keywords = extractKeywords(query);

  return docs
    .map((doc) => ({ doc, score: scoreRelevance(doc.content, keywords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ doc }) => doc);
}

export async function generateApplicationMaterials({
  jobDesc,
  jobTitle,
  company,
  documents,
}: {
  jobDesc: string;
  jobTitle: string;
  company: string;
  documents: { type: string; content: string }[];
}) {
  const allCoverLetters = documents.filter((d) => d.type === "cover_letter");
  const allResumes = documents.filter((d) => d.type === "resume");

  // Pick the most relevant cover letters based on keyword overlap with the job
  const relevantCoverLetters = selectRelevantDocs(
    allCoverLetters,
    jobDesc,
    jobTitle,
    MAX_SAMPLE_DOCS
  );

  const pastCoverLetters = relevantCoverLetters
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const pastResumes = allResumes
    .slice(0, 3)
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const systemPrompt = `You are an expert job application writer. Study the applicant's past cover letters carefully to understand their unique voice, tone, writing style, and experience. Generate tailored application materials that sound exactly like them.

SAMPLE COVER LETTERS (selected for relevance to this role):
${pastCoverLetters || "None provided yet."}

${pastResumes ? `RESUME / EXPERIENCE:\n${pastResumes}` : ""}

Mirror their sentence rhythm, word choices, and personality precisely. Be specific, confident, and human — never generic.`;

  const userPrompt = `Generate application materials for this role:

Company: ${company}
Job Title: ${jobTitle}

Job Description:
${jobDesc}

Return a JSON object with exactly these three keys:
- "coverLetter": A full cover letter in plain text, natural paragraphs, no headers
- "resume": A tailored resume in plain text optimized for this role
- "websiteHtml": A complete self-contained HTML page with inline CSS only (no external links). Make it visually stunning with a rose/pink/purple gradient aesthetic. Include: hero section with name and target role, about section, key skills for this job, relevant experience, and a contact call to action. Colors: #fb7185 (rose), #f472b6 (pink), #c084fc (purple), white backgrounds.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 65536,
    },
  });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt },
  ]);

  const text = result.response.text();

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Failed to parse Gemini response: ${cleaned.slice(0, 300)}`);
  }
}
