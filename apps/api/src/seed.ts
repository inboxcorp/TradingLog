import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create development user
  const devUser = await prisma.user.upsert({
    where: { id: 'dev-user-1' },
    update: {},
    create: {
      id: 'dev-user-1',
      email: 'dev@example.com',
      totalEquity: 10000.00, // $10k starting equity
    },
  });

  console.log('Created dev user:', devUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });