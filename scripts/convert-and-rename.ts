import * as mammoth from "mammoth";
import * as fs from "fs";
import * as path from "path";

const COVER_LETTERS_DIR = path.join(__dirname, "../documents/cover-letters");

async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return "";
  }
}

function parseMetadata(filename: string, text: string): { company?: string; role?: string } {
  // Try to extract from filename first
  const fileMatch = filename.match(/Letter\s+(?:[-–—]?\s*)?([^-–—]+?)(?:\s*[-–—]\s*(.+?))?\.docx$/i);
  if (fileMatch) {
    const part1 = fileMatch[1].trim();
    const part2 = fileMatch[2]?.trim();

    // If we have two parts, guess which is company vs role
    if (part2) {
      // Common role keywords
      const roleKeywords = ["manager", "director", "coordinator", "specialist", "advisor", "lead", "officer", "facilitator"];
      const isRole = roleKeywords.some((kw) => part2.toLowerCase().includes(kw));
      if (isRole) return { company: part1, role: part2 };
      return { company: part1, role: part2 };
    }

    // Single part - could be company or role
    const roleKeywords = ["manager", "director", "coordinator", "specialist", "advisor", "lead", "officer", "facilitator"];
    if (roleKeywords.some((kw) => part1.toLowerCase().includes(kw))) {
      return { role: part1 };
    }
    return { company: part1 };
  }

  // Fallback: try to find organization names from content
  const text_lower = text.toLowerCase();
  const companies = [
    "Arc'teryx", "Air Canada", "BC Hydro", "BCAA", "BCOHR", "CBC", "Canfor", "City of",
    "CBC", "Doctors of BC", "FIFA", "Girl Guides", "Law Foundation", "Lime", "Lightspeed",
    "Raymond James", "Rivers & Roots", "SCWIST", "SFU", "Strong Cities", "TELUS", "UBC",
    "VPL", "WorkSafeBC", "YMCA", "YWCA", "Women Deliver", "Women Moving Millions"
  ];

  for (const company of companies) {
    if (text_lower.includes(company.toLowerCase())) {
      return { company };
    }
  }

  return {};
}

async function main() {
  const files = fs
    .readdirSync(COVER_LETTERS_DIR)
    .filter((f) => f.endsWith(".docx") && f !== "README.md");

  console.log(`Converting and renaming ${files.length} cover letter files...\n`);

  for (const file of files) {
    const oldPath = path.join(COVER_LETTERS_DIR, file);
    const text = await extractTextFromDocx(oldPath);

    if (!text) {
      console.log(`⚠ skipped (couldn't read): ${file}`);
      continue;
    }

    const { company, role } = parseMetadata(file, text);
    let newName: string;

    if (company && role) {
      newName = `${role} @ ${company}.txt`;
    } else if (company) {
      newName = `${company}.txt`;
    } else if (role) {
      newName = `${role}.txt`;
    } else {
      newName = file.replace(/\.docx$/, ".txt");
    }

    // Save as txt
    const newPath = path.join(COVER_LETTERS_DIR, newName);
    fs.writeFileSync(newPath, text, "utf-8");
    console.log(`✓ ${file}`);
    console.log(`  → ${newName}\n`);

    // Delete old docx
    fs.unlinkSync(oldPath);
  }

  console.log("Done! All cover letters converted to .txt and renamed.");
}

main().catch(console.error);
