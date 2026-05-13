import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: npm run create-user -- <username> <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash: hash },
    create: { username, passwordHash: hash },
  });

  console.log(`✓ User "${user.username}" ready. ID: ${user.id}`);
  console.log(`  To assign existing docs: npm run assign-user -- ${user.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
