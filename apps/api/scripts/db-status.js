#!/usr/bin/env node
require('dotenv').config();

console.log('📊 Current Database Configuration');
console.log('================================');
console.log('');

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.includes('file:')) {
    console.log('🗄️  Database Type: SQLite (Local)');
    console.log(`📁 Database File: ${dbUrl.replace('file:', '')}`);
  } else if (dbUrl.includes('postgresql://')) {
    console.log('🌐 Database Type: PostgreSQL (Supabase)');
    console.log(`🔗 Database Host: ${dbUrl.split('@')[1]?.split('/')[0] || 'Unknown'}`);
  } else {
    console.log('❓ Database Type: Unknown');
  }
  
  console.log(`📍 Full URL: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
} else {
  console.log('❌ No DATABASE_URL found in environment');
}

console.log('');
console.log('Available commands:');
console.log('• npm run db:switch:sqlite   - Switch to SQLite');
console.log('• npm run db:switch:supabase - Switch to Supabase');
console.log('• npm run db:test            - Test current connection');
console.log('• npm run db:status          - Show this status');