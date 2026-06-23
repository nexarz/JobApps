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
  companyContext,
}: {
  jobDesc: string;
  jobTitle: string;
  company: string;
  documents: { type: string; content: string }[];
  tone?: "professional" | "playful";
  companyContext?: string;
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

  const companyBlock = companyContext
    ? `\n\nCOMPANY RESEARCH (verified context — use this to make the cover letter and website provably specific to ${company}; never invent details not present here):\n${companyContext}`
    : "";

  const userPrompt = `Generate application materials for this role:

Company: ${company}
Job Title: ${jobTitle}

Job Description:
${jobDesc}${companyBlock}

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

export type JobSuggestion = {
  query: string;       // Job-board search term e.g. "community engagement manager"
  label: string;       // Human-readable e.g. "Community Engagement Manager"
  rationale: string;   // 1 sentence why this fits — names the transferable skills in play
  seniority?: string;  // "entry" | "mid" | "senior" | "lead" — used to widen/narrow search
  // How far this role sits from the person's obvious search:
  //  direct   = a title they'd already search for
  //  adjacent = same skills, different function/title they may not think of
  //  stretch  = a level up, or a role their evidence supports them growing into
  //  wildcard = a non-obvious cross-industry pivot their skills unlock
  fitType?: "direct" | "adjacent" | "stretch" | "wildcard";
  transferableSkills?: string[]; // the specific skills that qualify them for this role
};

export async function suggestJobsFromVault(
  documents: { type: string; content: string }[],
  prefs: {
    location?: string | null;
    remotePref?: string | null;     // "any" | "remote_only" | "hybrid_ok" | "onsite_only"
    experienceYears?: number | null;
  } = {}
): Promise<JobSuggestion[]> {
  if (documents.length === 0) return [];

  const sample = documents
    .slice(0, 10)
    .map((d) => d.content.slice(0, 800))
    .join("\n\n---\n\n");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
  });

  const prefsBlock: string[] = [];
  if (prefs.location) prefsBlock.push(`- Location: ${prefs.location}`);
  if (prefs.remotePref) prefsBlock.push(`- Remote preference: ${prefs.remotePref.replace(/_/g, " ")}`);
  if (typeof prefs.experienceYears === "number") prefsBlock.push(`- Years of experience: ${prefs.experienceYears}`);

  const seniorityHint = typeof prefs.experienceYears === "number"
    ? prefs.experienceYears < 2 ? "entry"
      : prefs.experienceYears < 5 ? "mid"
      : prefs.experienceYears < 9 ? "senior"
      : "lead"
    : null;

  const result = await model.generateContent(`
You are a sharp career strategist who is famous for spotting non-obvious career moves. People come to you precisely because you surface roles they would never have searched for themselves — but that, once you explain the fit, feel obviously right.

Below are excerpts from one person's cover letters and resumes.

DOCUMENTS:
${sample}

${prefsBlock.length ? `APPLICANT PREFERENCES:\n${prefsBlock.join("\n")}\n` : ""}
STEP 1 — Look past their job titles. Job titles are the trap; skills are the signal. Read the evidence and extract the underlying TRANSFERABLE assets:
- Hard skills and tools (e.g. SQL, budgeting, A/B testing, Figma, stakeholder management)
- Soft/leadership capabilities demonstrated with evidence (e.g. ran cross-functional projects, managed P&L, scaled a team)
- Domain knowledge (e.g. healthcare, fintech, climate, education)
- The "shape" of work they're good at (e.g. ambiguous 0-to-1 building, optimizing mature systems, client-facing persuasion, deep analysis)

STEP 2 — Map those assets to roles ACROSS functions and industries. The whole point is reach: most of these should be roles the person would NOT type into a search box themselves, but that their evidence genuinely qualifies them for. A skill like "translated complex data into decisions for executives" opens analyst, strategy, product, and consulting roles — not just their last title.

Return a JSON array of exactly 6 suggestions with this distribution:
- 1 "direct": an obvious fit, a title they'd already search for (anchor / sanity check)
- 2 "adjacent": same core skills, different function or title they likely haven't considered
- 2 "stretch": a clear level-up, or a role their evidence shows they're ready to grow into
- 1 "wildcard": a genuinely non-obvious cross-industry or cross-function pivot their skills unlock — surprising but defensible

Rules for every suggestion:
- It MUST be grounded in concrete evidence from the documents. Never suggest a role the evidence can't support. "transferableSkills" must quote real skills you saw, not generic filler.
- The "rationale" must name the specific transferable skills that make the leap make sense — especially for adjacent/stretch/wildcard, explain the non-obvious connection in one vivid sentence.
- The "query" field is passed VERBATIM to a real job board, so it must be a real, searchable job title:
  - 2-4 words, lowercase, no punctuation
  - Use canonical titles that actually appear in postings (e.g. "product marketing manager" not "growth storyteller")
  - Do NOT include location — that is handled separately
${seniorityHint ? `- Calibrate seniority around "${seniorityHint}" unless the fitType is "stretch" (then aim one level higher).` : "- Infer a sensible seniority from the evidence."}
- Avoid near-duplicate queries — each should open a distinct pocket of the job market.

Format:
[
  {
    "query": "canonical job title, 2-4 lowercase words",
    "label": "Human Readable Title",
    "fitType": "direct" | "adjacent" | "stretch" | "wildcard",
    "transferableSkills": ["skill pulled from the docs", "another real skill"],
    "rationale": "One vivid sentence naming the transferable skills that make this fit — sell the non-obvious connection",
    "seniority": "entry" | "mid" | "senior" | "lead"
  }
]`);

  const raw = result.response.text()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    throw new Error(`SUGGEST_PARSE_FAIL: ${raw.slice(0, 400)}`);
  }
}

export type InterviewQuestion = {
  question: string;
  category: string;          // "behavioral" | "technical" | "company-specific" | "role-specific" | "situational"
  whyAsked: string;          // Why this question is likely at this stage
  approach: string;          // How to structure the answer (STAR, framework, etc.)
  draftAnswer?: string;      // Optional scaffolded answer using vault context
};

export type InterviewPrepContent = {
  stageOverview: string;     // What to expect at this stage
  tips: string[];            // Stage-specific tips
  questions: InterviewQuestion[];
  questionsToAsk: string[];  // Questions the candidate should ask the interviewer
  redFlags: string[];        // What to watch out for
  preparation: string[];     // What to do in the 24h before
};

const STAGE_LABELS: Record<string, string> = {
  recruiter_screen: "Recruiter / phone screen",
  hiring_manager: "Hiring manager interview",
  technical: "Technical interview",
  onsite: "Onsite / panel",
  exec: "Executive / final round",
  behavioral: "Behavioral interview",
};

export async function generateInterviewPrep({
  stage,
  jobTitle,
  company,
  jobDesc,
  vaultSample,
  companyContext,
}: {
  stage: string;
  jobTitle: string;
  company: string;
  jobDesc: string;
  vaultSample: string;
  companyContext?: string;
}): Promise<InterviewPrepContent> {
  const stageLabel = STAGE_LABELS[stage] ?? stage;

  const stageGuidance: Record<string, string> = {
    recruiter_screen: "Recruiter screens are 20-30 min, non-technical, focused on motivation, salary, logistics, and high-level fit. Questions tend to be open-ended ('tell me about yourself'), filtering for red flags before passing to the hiring manager.",
    hiring_manager: "Hiring manager interviews dig into role-specific experience and judgment. Expect questions about how you'd handle real situations from this team, your management style (if applicable), and why this company specifically. They are evaluating whether you can do the job AND whether they want to work with you.",
    technical: "Technical interviews assess depth of skill in the role's core domain. Expect specific scenarios, case-based questions, system design or live problem-solving, and probes for trade-off thinking. Show your reasoning, not just the answer.",
    onsite: "Onsite/panel rounds combine multiple interviewers across behavioral, technical, and cross-functional fit. Each interviewer typically has a focus area. Endurance and consistency matter — the same story may be asked twice.",
    exec: "Exec / final-round interviews assess strategic thinking, ambition, and culture-add at a senior level. Less 'can you do the job' and more 'do you have judgment, vision, and presence'. Expect open-ended business questions.",
    behavioral: "Behavioral rounds use the STAR framework (Situation, Task, Action, Result) to probe past experience as a predictor of future performance. Prepare 6-8 vivid stories that flex to multiple questions.",
  };

  const prompt = `You are an interview coach preparing a candidate for a specific stage of a real interview process.

ROLE: ${jobTitle} at ${company}
STAGE: ${stageLabel}

JOB DESCRIPTION:
${jobDesc}

${companyContext ? `COMPANY RESEARCH:\n${companyContext}\n` : ""}
${vaultSample ? `CANDIDATE BACKGROUND (excerpts from their resume/cover letters — use as factual source for draft answers):\n${vaultSample}\n` : ""}
STAGE CONTEXT:
${stageGuidance[stage] ?? "General interview stage."}

Generate a focused prep guide. Be specific to THIS company, THIS role, and THIS stage — generic advice is useless.

For questions:
- 8-10 questions total
- Mix of categories: company-specific (referencing the actual company), role-specific (from the JD), behavioral (drawing on candidate's background), and at least 2 stage-appropriate curveballs
- For each, explain why it would be asked at this stage AND give an approach
- For 3-4 of the most important ones, draft an answer using the candidate's actual background — flag it as a draft they should adapt

Return JSON with this exact shape:
{
  "stageOverview": "2-3 sentence summary of what to expect at this stage with this company",
  "tips": ["3-5 stage-specific tips, each one sentence and actionable"],
  "questions": [
    {
      "question": "the question",
      "category": "behavioral | technical | company-specific | role-specific | situational",
      "whyAsked": "1 sentence on why this question shows up at this stage",
      "approach": "1-2 sentences on how to structure the answer",
      "draftAnswer": "optional draft using candidate's background, 3-5 sentences"
    }
  ],
  "questionsToAsk": ["4-5 thoughtful questions the candidate should ask the interviewer — specific to the company and stage"],
  "redFlags": ["2-3 things to watch out for in this interview that might signal a bad role"],
  "preparation": ["4-5 concrete things to do in the 24h before the interview"]
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Failed to parse interview prep response: ${raw.slice(0, 300)}`);
  }
}

export type AnalysisSection = {
  name: string;
  score: number;
  status: "pass" | "warn" | "fail";
  feedback: string;
  suggestions: string[];
};

export type AnalysisResult = {
  score: number;
  summary: string;
  sections: AnalysisSection[];
  criticalFixes: string[];
  quickWins: string[];
};

export async function analyzeDocument({
  text,
  type,
  jobDesc,
  jobTitle,
  company,
}: {
  text: string;
  type: "resume" | "cover_letter";
  jobDesc: string;
  jobTitle: string;
  company: string;
}): Promise<AnalysisResult> {
  const resumeSections = `
Analyze across these 6 categories:

1. KEYWORD ALIGNMENT — Are exact keywords, tool names, and skill names from the job description present? Are they placed contextually inside bullets (not just the skills list)?
2. QUANTIFICATION RATE — What percentage of experience bullets contain a number ($, %, headcount, timeframe, scale)? Target is 70%+.
3. BULLET STRUCTURE — Do bullets follow impact-first structure (result → action → context)? Flag any that start with weak openers like "Responsible for", "Helped", "Assisted", "Worked on".
4. SKILLS SECTION — Is it present and prominent? Does it use exact JD terminology? Are skills listed as standalone nouns without "Expert in / Proficient in" wrappers?
5. ATS FORMATTING — Any formatting red flags: tables, columns, text boxes, graphics, headers/footers, inconsistent date formats, missing dates, personal pronouns ("I led"), objective statement, "References available"?
6. AI DETECTION RISK — Does the text contain AI-generation signals: filler phrases ("passionate about", "thrilled to apply", "leverage my skills", "dynamic team", "I would be a great fit"), uniform sentence lengths, overly polished but hollow language?`;

  const coverLetterSections = `
Analyze across these 6 categories:

1. COMPANY SPECIFICITY — Does the letter contain at least one detail that is provably specific to ${company} (mission, product, recent initiative, something that couldn't be copy-pasted elsewhere)?
2. KEYWORD INTEGRATION — Are exact keywords from the job description woven naturally into the text (not stuffed)?
3. ACHIEVEMENT EVIDENCE — Does it include 2-3 concrete achievements with specific numbers that map to the JD requirements?
4. VOICE & AUTHENTICITY — Does it read like a real human being? Flag AI-generation signals: filler phrases ("passionate about", "thrilled to apply", "leverage my skills", "dynamic team"), uniform sentence rhythm, corporate hollow language.
5. STRUCTURE & LENGTH — Is it 3-4 short paragraphs, half a page or less? Does it have a strong hook opening (not "I am writing to apply")?
6. OPENING STRENGTH — Does the first sentence immediately establish relevance and hook the reader?`;

  const prompt = `You are an expert ATS and hiring consultant analyzing a job application document for 2026 screening standards.

ROLE BEING APPLIED FOR: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDesc}

---

DOCUMENT TO ANALYZE (${type === "resume" ? "RESUME" : "COVER LETTER"}):
${text}

---

${type === "resume" ? resumeSections : coverLetterSections}

For each category return:
- score: 0-100
- status: "pass" (75+), "warn" (50-74), "fail" (under 50)
- feedback: 1-2 sentences on what you found
- suggestions: 2-3 specific, actionable improvements (not generic advice — reference actual content from the document)

Also return:
- score: overall weighted score 0-100
- summary: 2-sentence overall verdict
- criticalFixes: up to 3 highest-impact changes that would most improve ATS/screening success
- quickWins: up to 3 easy changes that take under 5 minutes

Return a JSON object with exactly this shape:
{
  "score": number,
  "summary": string,
  "sections": [{ "name": string, "score": number, "status": "pass"|"warn"|"fail", "feedback": string, "suggestions": string[] }],
  "criticalFixes": string[],
  "quickWins": string[]
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Failed to parse analysis response: ${raw.slice(0, 300)}`);
  }
}

export async function improveDocument({
  text,
  type,
  analysis,
  jobDesc,
  jobTitle,
  company,
}: {
  text: string;
  type: "resume" | "cover_letter";
  analysis: AnalysisResult;
  jobDesc: string;
  jobTitle: string;
  company: string;
}): Promise<string> {
  const issueDigest = [
    `Overall score: ${analysis.score}/100`,
    `Summary: ${analysis.summary}`,
    `\nCritical fixes needed:\n${analysis.criticalFixes.map((f) => `- ${f}`).join("\n")}`,
    `\nQuick wins:\n${analysis.quickWins.map((w) => `- ${w}`).join("\n")}`,
    `\nPer-section issues:`,
    ...analysis.sections
      .filter((s) => s.status !== "pass")
      .map(
        (s) =>
          `${s.name} (${s.score}/100): ${s.feedback}\n${s.suggestions.map((sg) => `  → ${sg}`).join("\n")}`
      ),
  ].join("\n");

  const prompt = type === "resume"
    ? `You are an ATS optimization expert. Rewrite the resume below to fix every issue identified in the analysis report. The rewrite must address all critical fixes and quick wins while preserving every factual detail (roles, companies, dates, metrics). Do not invent new facts.

ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDesc}

ANALYSIS REPORT — fix ALL of these:
${issueDigest}

ORIGINAL RESUME:
${text}

Rewrite rules:
- Fix all ATS formatting issues (section labels, date format, remove personal pronouns, remove objective/references lines)
- Restructure bullets to impact-first (result → action → context)
- Add/fix quantification where the original has evidence but no numbers; where no evidence exists, restructure the bullet rather than inventing numbers
- Mirror exact keyword and tool names from the job description
- Preserve the applicant's voice and all real facts
- Return plain text only — no markdown, no headers with #, no special characters`
    : `You are an expert cover letter editor. Rewrite the cover letter below to fix every issue identified in the analysis report while preserving the applicant's voice and all factual claims.

ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDesc}

ANALYSIS REPORT — fix ALL of these:
${issueDigest}

ORIGINAL COVER LETTER:
${text}

Rewrite rules:
- Address the company specifically — if the original lacks a concrete company-specific detail, add one from the job description's language/mission
- Strengthen or replace a weak opening hook (never start with "I am writing to apply")
- Weave in 2-3 achievements with concrete numbers where the original is vague; only use metrics you can infer from the original text
- Remove any AI-detection signals (filler phrases, uniform sentence rhythm, hollow corporate language)
- Keep it to 3-4 tight paragraphs, half a page or less
- Preserve the applicant's voice — do not make it sound more formal or more AI-generated than the original
- Return plain text only — no markdown, no special characters`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { maxOutputTokens: 16384 },
  });

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
