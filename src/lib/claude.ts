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

  const systemPrompt = `You are a ghostwriter who has studied this applicant's writing exhaustively. Your job is to write new materials that are indistinguishable from their own hand — someone who knows them personally should read the output and think "yes, that sounds exactly like them."

APPLICANT'S PAST COVER LETTERS (study these carefully):
${pastCoverLetters || "None provided yet — write in a confident, direct, human voice."}

${pastResumes ? `APPLICANT'S PAST RESUMES / EXPERIENCE (use as the factual source of truth for their background):\n${pastResumes}` : ""}

Before generating anything, extract these voice fingerprints from the sample letters:
1. SENTENCE RHYTHM — do they write in short punchy sentences, longer flowing ones, or a mix? Do they use em-dashes, semicolons, or keep it simple?
2. VOCABULARY LEVEL — formal/academic, conversational, industry-technical, or casual-professional?
3. PERSONALITY MARKERS — are they warm and personable, direct and no-nonsense, self-deprecating, enthusiastic? Pick out 3-5 recurring personality traits.
4. OPENING PATTERNS — how do they typically start a letter? Do they lead with a bold claim, a specific achievement, a question, a story?
5. HOW THEY DESCRIBE THEIR WORK — do they use "I led", "collaborated with", "built", "drove"? What verbs and framing do they favor?
6. THINGS THEY NEVER SAY — identify any corporate filler they avoid, any phrases that would feel out of character.

The cover letter and website copy must pass this test: a colleague who has read their past letters should recognize this as authentically theirs. The ATS formatting rules constrain the structure — but the voice, word choices, and personality must be 100% theirs.

The resume uses their real experience and achievements from the samples above. Do not invent roles, companies, or accomplishments — only use what is evidenced in the provided materials.`;

  const userPrompt = `Generate application materials for this role:

Company: ${company}
Job Title: ${jobTitle}

Job Description:
${jobDesc}

---

RESUME RULES (always ATS + LLM-screener optimized for 2026):

FORMATTING:
- Plain text only. No tables, no columns, no icons, no graphics, no special characters, no decorative elements.
- Contact info at top IN the document body (never in a header/footer — parsers skip those).
- Section labels must be standard exact strings: "Professional Summary", "Skills", "Work Experience", "Education", "Certifications".
- Dates in consistent format: MMM YYYY (e.g. Jan 2022). Missing dates trigger auto-rejection in modern ATS.
- No personal pronouns ("I led..." → "Led...").
- No objective statement. No "References available upon request."
- Length: 1 page for under 5 years experience, 2 pages max for mid-career.

SECTION ORDER (this order is scored by ATS skills-first filtering):
1. Contact Info
2. Professional Summary (2-3 sentences: who you are + 3-5 exact keywords from this specific JD)
3. Skills (this is the FIRST gate — many systems score this before reading work history)
4. Work Experience
5. Education
6. Certifications (if any)

SKILLS SECTION:
- List only hard skills, tools, platforms, and certifications that appear in the job description.
- Use the JD's exact names — if it says "Salesforce" write "Salesforce" not "CRM software."
- Format: plain comma-separated or line-separated nouns. No "Expert in X" or "Proficient in Y."
- Include any AI/modern tools relevant to the role (expected in 2026 even for non-technical roles).

WORK EXPERIENCE BULLETS:
- "Impact first" structure: result → action → context. E.g. "Reduced churn by 23% by redesigning onboarding flow for 50K users" — NOT "Redesigned onboarding flow which reduced churn."
- 70%+ of bullets must contain a number ($, %, headcount, timeframe, scale).
- 4–6 bullets per role, most recent role gets the most.
- Embed exact JD keywords contextually inside bullets — a keyword used in a quantified bullet scores significantly higher than the same keyword in the skills list alone.
- Use both acronym and full form for credentials once (e.g. "Project Management Professional (PMP)").
- Lead with strong action verbs. Avoid weak openers: "Responsible for", "Helped", "Assisted", "Worked on."

KEYWORD STRATEGY:
- Extract the JD's exact hard skill names, tool names, certification names, and culture/methodology phrases.
- Each key term should appear: (a) in the Skills section by exact name, AND (b) at least once in a quantified experience bullet with context.
- Mirror the JD's exact phrasing everywhere — do not substitute synonyms.
- Do NOT stuff keywords — an LLM screening layer will penalize a skills list disconnected from actual experience.

---

${coverLetterToneInstructions}

VOICE RULE (non-negotiable): The cover letter must sound like the applicant wrote it, not like an AI following a template. The ATS rules below are the structural container — the voice extracted from the vault samples is the content. Every sentence should reflect their specific rhythm, vocabulary, and personality. If the vault samples show someone who writes casually and warmly, this letter should too. If they write with dry wit, so should this.

Additional cover letter rules (2026):
- Plain text, clean paragraphs, no bullet points, no special formatting.
- 3–4 short paragraphs, half a page or less — 70% of hiring managers prefer this length.
- CRITICAL: Must be provably specific to this company and role. Include at least one detail about ${company} that proves this was written for them — their mission, product, a recent initiative, what makes them distinct. Generic letters are immediately dismissed.
- Paragraph 1: Specific hook + name the role + why THIS company (not any company).
- Paragraph 2: 2–3 achievements with concrete numbers that directly map to the JD's stated requirements.
- Paragraph 3: Something the resume can't say — a perspective on where the industry is going, how you'd approach a challenge they face, or what excites you about their specific work.
- Closing: One sentence, direct call to action.
- CRITICAL: Must sound like a real human being wrote it. 43% of large employers now run AI detection. Write with natural sentence variety — mix short punchy sentences with longer ones. Avoid corporate filler phrases like "I am passionate about", "I would be a great fit", "leverage my skills", "thrilled to apply", "dynamic team." Write how an articulate, confident person actually speaks.

${websiteToneInstructions}

Additional website rules:
- Complete self-contained HTML with inline CSS only (no external links, no CDN).
- Include: hero section (name + target role at ${company}), about/intro, key skills matching the JD, 2-3 experience highlights with impact numbers, contact CTA.
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
