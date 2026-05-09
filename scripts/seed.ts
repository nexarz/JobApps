import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const DOCS_ROOT = path.join(__dirname, "../documents");

function parseFilename(filename: string): { title: string; company?: string; role?: string } {
  const base = filename.replace(/\.(txt|md)$/, "");
  // Try to parse "Role @ Company" or "Company - Role" patterns
  const atMatch = base.match(/^(.+?)\s*@\s*(.+)$/);
  if (atMatch) return { title: base, role: atMatch[1].trim(), company: atMatch[2].trim() };
  const dashMatch = base.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) return { title: base, company: dashMatch[1].trim(), role: dashMatch[2].trim() };
  return { title: base };
}

async function seedFolder(folderPath: string, type: "cover_letter" | "resume") {
  if (!fs.existsSync(folderPath)) return;

  const files = fs.readdirSync(folderPath).filter((f) => f.match(/\.(txt|md)$/));
  console.log(`\nSeeding ${files.length} ${type === "cover_letter" ? "cover letters" : "resumes"} from ${folderPath}`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(folderPath, file), "utf-8").trim();
    if (!content) continue;

    const { title, company, role } = parseFilename(file);

    const existing = await prisma.document.findFirst({ where: { title, type } });
    if (existing) {
      console.log(`  ↩ skipped (already exists): ${title}`);
      continue;
    }

    await prisma.document.create({ data: { type, title, content, company, role } });
    console.log(`  ✓ imported: ${title}`);
  }
}

async function main() {
  console.log("Seeding documents from /documents folder...");
  await seedFolder(path.join(DOCS_ROOT, "cover-letters"), "cover_letter");
  await seedFolder(path.join(DOCS_ROOT, "resumes"), "resume");
  console.log("\nDone.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
