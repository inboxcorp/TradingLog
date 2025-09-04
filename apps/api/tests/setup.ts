import { beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { calculateTradeRisk } from '@trading-log/shared';

// Set NODE_ENV for tests
process.env.NODE_ENV = 'development';

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

// Test helper functions
export const clearDatabase = async () => {
  await prisma.methodAnalysis.deleteMany({});
  await prisma.mindsetTag.deleteMany({});
  await prisma.trade.deleteMany({});
  await prisma.equitySnapshot.deleteMany({});
  await prisma.user.deleteMany({});
};

export const createTestUser = async (data?: Partial<{
  email: string;
  totalEquity: number;
}>) => {
  return await prisma.user.create({
    data: {
      email: data?.email || `test-${Date.now()}@example.com`,
      totalEquity: data?.totalEquity || 100000,
    }
  });
};

export const createTestTrade = async (userId: string, data?: Partial<{
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  positionSize: number;
  stopLoss: number;
  exitPrice?: number;
  status: 'ACTIVE' | 'CLOSED';
  realizedPnL?: number;
  notes?: string;
  methodAnalysis?: Array<{
    timeframe: string;
    indicator: string;
    signal: string;
    divergence: string;
    notes?: string;
  }>;
  mindsetTags?: Array<{
    tag: string;
    intensity: string;
  }>;
}>) => {
  const tradeData = {
    symbol: data?.symbol || 'AAPL',
    direction: data?.direction || 'LONG',
    entryPrice: data?.entryPrice || 100,
    positionSize: data?.positionSize || 10,
    stopLoss: data?.stopLoss || 95,
    exitPrice: data?.exitPrice || null,
    status: data?.status || 'ACTIVE',
    realizedPnL: data?.realizedPnL || null,
    notes: data?.notes || null,
    ...data
  };

  const riskAmount = calculateTradeRisk(tradeData.entryPrice, tradeData.stopLoss, tradeData.positionSize);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const riskPercentage = user ? (riskAmount / user.totalEquity) * 100 : 0;

  const trade = await prisma.trade.create({
    data: {
      userId,
      symbol: tradeData.symbol,
      direction: tradeData.direction,
      entryPrice: tradeData.entryPrice,
      positionSize: tradeData.positionSize,
      stopLoss: tradeData.stopLoss,
      exitPrice: tradeData.exitPrice,
      status: tradeData.status,
      entryDate: new Date(),
      exitDate: tradeData.status === 'CLOSED' ? new Date() : null,
      realizedPnL: tradeData.realizedPnL,
      riskAmount,
      riskPercentage,
      notes: tradeData.notes,
    }
  });

  // Add method analysis if provided
  if (data?.methodAnalysis && data.methodAnalysis.length > 0) {
    await prisma.methodAnalysis.createMany({
      data: data.methodAnalysis.map(analysis => ({
        tradeId: trade.id,
        timeframe: analysis.timeframe,
        indicator: analysis.indicator,
        signal: analysis.signal,
        divergence: analysis.divergence || 'NONE',
        notes: analysis.notes || null,
      }))
    });
  }

  // Add mindset tags if provided
  if (data?.mindsetTags && data.mindsetTags.length > 0) {
    await prisma.mindsetTag.createMany({
      data: data.mindsetTags.map(tag => ({
        tradeId: trade.id,
        tag: tag.tag,
        intensity: tag.intensity || 'MEDIUM',
      }))
    });
  }

  return trade;
};