import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return prismaInstance;
}

export async function cleanupTestDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '_prisma%'
  `;

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
}

export async function disconnectTestDb(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
  prismaInstance = null;
}
