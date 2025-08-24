import { beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Setup test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

beforeAll(async () => {
  // Ensure database is ready for tests
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up database connections
  await prisma.$disconnect();
});