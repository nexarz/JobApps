import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

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
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const pastResumes = documents
    .filter((d) => d.type === "resume")
    .map((d) => d.content)
    .join("\n\n---\n\n");

  const systemPrompt = `You are an expert job application writer. You have been given samples of the applicant's past cover letters and resumes. Your job is to deeply understand their unique voice, tone, writing style, and experience, then generate tailored application materials for a new role.

PAST COVER LETTERS:
${pastCoverLetters || "None provided yet."}

PAST RESUMES / EXPERIENCE:
${pastResumes || "None provided yet."}

Match the applicant's authentic voice precisely. Be specific, confident, and human — never generic or corporate. Mirror their sentence rhythm, word choices, and personality.`;

  const userPrompt = `Generate application materials for this role:

Company: ${company}
Job Title: ${jobTitle}

Job Description:
${jobDesc}

Return a JSON object with exactly these three keys:
1. "coverLetter" - A full cover letter (plain text, no markdown headers, natural paragraphs)
2. "resume" - A tailored resume in plain text format optimized for this role
3. "websiteHtml" - A complete, self-contained HTML page (single file with inline CSS) that serves as a personal application website for this specific role. Make it visually stunning with a rose/pink/purple gradient aesthetic, animations, and modern design. Include sections: hero with name and role, about/story, key skills relevant to this job, relevant experience highlights, and a call to action. Use the same color palette: rose-400 (#fb7185), pink-400 (#f472b6), purple-400 (#c084fc), with white backgrounds and smooth gradients.

Return only valid JSON, no markdown fences.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt },
  ]);

  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse Gemini response as JSON");
  }
}
