import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const MAX_SAMPLE_DOCS = 15;

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "this", "that", "these", "those", "i", "my",
  "we", "our", "you", "your", "they", "their", "it", "its", "as", "not",
  "also", "all", "more", "than", "into", "through", "during", "including",
  "within", "across", "well", "both", "each", "which", "who", "very",
]);

// Lightweight stemmer: reduces words to a common root so "managing",
// "manager", "management" all match the same stem "manag"
function stem(word: string): string {
  // Order matters — longest suffixes first
  const rules: [RegExp, string][] = [
    [/ational$/, "ate"],
    [/tional$/, "tion"],
    [/ization$/, "ize"],
    [/iveness$/, "ive"],
    [/fulness$/, "ful"],
    [/ousness$/, "ous"],
    [/alism$/, "al"],
    [/ation$/, "ate"],
    [/ities$/, "ity"],
    [/ment$/, ""],
    [/ness$/, ""],
    [/tion$/, "t"],
    [/ing$/, ""],
    [/ies$/, "y"],
    [/ers$/, "er"],
    [/ed$/, ""],
    [/ly$/, ""],
    [/er$/, ""],
    [/al$/, ""],
    [/ic$/, ""],
    [/s$/, ""],
  ];

  for (const [pattern, replacement] of rules) {
    if (word.match(pattern) && word.replace(pattern, replacement).length > 3) {
      return word.replace(pattern, replacement);
    }
  }
  return word;
}

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      .map(stem)
  );
}

function scoreRelevance(doc: string, keywords: Set<string>): number {
  const docStems = extractKeywords(doc);
  const docLower = doc.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (docStems.has(kw)) {
      score++;
      // Bonus for frequency — capped at 3
      const count = (docLower.match(new RegExp(kw, "g")) || []).length;
      if (count > 1) score += Math.min(count - 1, 3);
    }
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
  tone = "professional",
}: {
  jobDesc: string;
  jobTitle: string;
  company: string;
  documents: { type: string; content: string }[];
  tone?: "professional" | "playful";
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

  const coverLetterToneInstructions = tone === "playful"
    ? `COVER LETTER TONE — PLAYFUL & PERSONALITY-FORWARD:
Write with energy, wit, and genuine personality. Open with a punchy, memorable hook — not "I am writing to apply for." Be conversational and human. Show enthusiasm for the company specifically. Still include 2-3 specific achievements with metrics, but deliver them with personality rather than corporate stiffness. The goal: a real human being they'd want to meet, not a walking LinkedIn profile.`
    : `COVER LETTER TONE — PROFESSIONAL & SHARP:
Write with confident, precise language. Open by immediately connecting your most relevant experience to their specific need — name the role and company in the first sentence. Include 2-3 achievements with concrete metrics (numbers, percentages, timelines) that directly match the job requirements. Mirror exact language and keywords from the job description. Keep paragraphs short and skimmable. Close with a clear, direct call to action.`;

  const websiteToneInstructions = tone === "playful"
    ? `WEBSITE TONE: High energy, bold personality, fun copy. Use punchy headlines, playful language, first-person voice. Still highlight skills and experience but with flair and enthusiasm.`
    : `WEBSITE TONE: Polished, professional, confident. Clean headlines that communicate value immediately. Concise, achievement-focused copy.`;

  const systemPrompt = `You are an expert job application writer. Study the applicant's past cover letters carefully to understand their unique voice, tone, writing style, and experience. Generate tailored application materials.

SAMPLE COVER LETTERS (selected for relevance to this role):
${pastCoverLetters || "None provided yet."}

${pastResumes ? `RESUME / EXPERIENCE:\n${pastResumes}` : ""}

Mirror the applicant's sentence rhythm, word choices, and specific experiences. Be specific and concrete — never generic.`;

  const userPrompt = `Generate application materials for this role:

Company: ${company}
Job Title: ${jobTitle}

Job Description:
${jobDesc}

---

RESUME RULES (always apply — ATS-optimized):
- Plain text only. No tables, no columns, no icons, no special characters, no decorative elements.
- Contact info at the top IN the document body (never in a header).
- Section order: Contact Info → Professional Summary (2-3 lines, keyword-rich) → Skills → Work Experience → Education → Certifications (if any).
- Skills section: list only hard skills and tools that appear in the job description, as standalone nouns (e.g. "Python, SQL, Figma") — no "Expert in X" phrasing.
- Work Experience: Company | Title | Date (MM/YYYY). 4–6 bullet points per role. Every bullet must start with a strong action verb + specific outcome + metric (e.g. "Reduced deployment time by 40% by implementing CI/CD pipeline").
- Embed exact keywords from the job description naturally throughout. Mirror the JD's exact phrasing — if it says "stakeholder engagement," use "stakeholder engagement," not "stakeholder management."
- Use both the acronym and full form for credentials (e.g. "Project Management Professional (PMP)").
- Dates in consistent format: MMM YYYY (e.g. Jan 2022).
- Aim for 1 page if experience allows; 2 pages maximum.
- Bold must NOT be used (plain text only — bolding is done by the human when formatting).

${coverLetterToneInstructions}

Additional cover letter rules:
- Plain text, no special formatting, no headers, no bullet points — clean paragraphs only.
- 3–4 short paragraphs total.
- Paragraph 1: Hook + name the role + 1-2 relevant keywords from JD used naturally.
- Paragraph 2: 2–3 achievements with specific numbers that match JD requirements.
- Paragraph 3: Why this company specifically + culture/mission alignment.
- Closing: Brief, direct call to action.

${websiteToneInstructions}

Additional website rules:
- Complete self-contained HTML with inline CSS only (no external links, no CDN).
- Include: hero section (name + target role), about/intro, key skills (highlight those from JD), relevant experience highlights, contact CTA.
- Visually stunning: rose/pink/purple gradient aesthetic. Colors: #fb7185 (rose), #f472b6 (pink), #c084fc (purple).
- Mobile-responsive using CSS only.

Return a JSON object with exactly these three keys:
- "coverLetter": plain text cover letter
- "resume": plain text ATS-optimized resume
- "websiteHtml": complete self-contained HTML string`;

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
