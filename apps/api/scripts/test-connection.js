#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Testing database connection...');
    console.log(`📍 Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`);
    
    // Test basic connectivity
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test if we can query
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    const tradeCount = await prisma.trade.count();
    console.log(`📊 Trades in database: ${tradeCount}`);
    
    // Test if dev user exists
    const devUser = await prisma.user.findUnique({
      where: { id: 'dev-user-1' }
    });
    
    if (devUser) {
      console.log(`💰 Dev user equity: $${devUser.totalEquity}`);
    } else {
      console.log('⚠️ No dev user found - run: npm run db:seed');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'P1001') {
      console.log('');
      console.log('💡 Suggestions:');
      console.log('   - If using Supabase: Check if your project is paused in dashboard');
      console.log('   - If using SQLite: Make sure the database file exists');
      console.log('   - Verify your DATABASE_URL in .env file');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();