import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: tsx scripts/assign-user.ts <userId>");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user) {
  console.error(`No user found with ID: ${userId}`);
  process.exit(1);
}

const docs = await prisma.document.updateMany({
  where: { userId: null },
  data: { userId },
});

const apps = await prisma.application.updateMany({
  where: { userId: null },
  data: { userId },
});

console.log(`✓ Assigned ${docs.count} documents and ${apps.count} applications to "${user.username}"`);

await prisma.$disconnect();
