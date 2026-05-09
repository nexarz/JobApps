import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error("Usage: tsx scripts/create-user.ts <username> <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { username },
  update: { passwordHash: hash },
  create: { username, passwordHash: hash },
});

console.log(`✓ User "${user.username}" ready. ID: ${user.id}`);
console.log(`  Run this to assign existing docs: tsx scripts/assign-user.ts ${user.id}`);

await prisma.$disconnect();
