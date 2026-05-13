import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`\n${users.length} users in database:`);
  for (const user of users) {
    const docs = await prisma.document.count({ where: { userId: user.id } });
    const apps = await prisma.application.count({ where: { userId: user.id } });
    console.log(`  ${user.username} (${user.id}): ${docs} docs, ${apps} apps`);
  }

  const unowned = await prisma.document.count({ where: { userId: null } });
  console.log(`\n  Unassigned documents: ${unowned}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
