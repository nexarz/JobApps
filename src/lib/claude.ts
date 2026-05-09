import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Only use the 15 most recent cover letters to keep context manageable
const MAX_SAMPLE_DOCS = 15;

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
  const pastCoverLetters = documents
    .filter((d) => d.type === "cover_letter")
    .slice(0, MAX_SAMPLE_DOCS)
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const pastResumes = documents
    .filter((d) => d.type === "resume")
    .slice(0, 3)
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const systemPrompt = `You are an expert job application writer. Study the applicant's past cover letters carefully to understand their unique voice, tone, writing style, and experience. Generate tailored application materials that sound exactly like them.

SAMPLE COVER LETTERS:
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
