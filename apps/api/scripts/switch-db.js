#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DB_TYPE = process.argv[2];
const SCHEMA_DIR = path.join(__dirname, '..', 'prisma');
const CURRENT_SCHEMA = path.join(SCHEMA_DIR, 'schema.prisma');
const SQLITE_SCHEMA = path.join(SCHEMA_DIR, 'schema.sqlite.prisma');
const POSTGRESQL_SCHEMA = path.join(SCHEMA_DIR, 'schema.postgresql.prisma');

if (!DB_TYPE || !['sqlite', 'postgresql', 'supabase'].includes(DB_TYPE)) {
  console.error('Usage: node switch-db.js <sqlite|postgresql|supabase>');
  console.error('');
  console.error('Examples:');
  console.error('  node switch-db.js sqlite     # Switch to local SQLite');
  console.error('  node switch-db.js postgresql # Switch to PostgreSQL');
  console.error('  node switch-db.js supabase   # Switch to Supabase (PostgreSQL)');
  process.exit(1);
}

try {
  let sourceSchema;
  let sourceEnv;

  if (DB_TYPE === 'sqlite') {
    sourceSchema = SQLITE_SCHEMA;
    sourceEnv = path.join(SCHEMA_DIR, '..', '.env.sqlite');
    console.log('🔄 Switching to SQLite database...');
  } else {
    sourceSchema = POSTGRESQL_SCHEMA;
    sourceEnv = path.join(SCHEMA_DIR, '..', '.env.supabase');
    console.log(`🔄 Switching to ${DB_TYPE === 'supabase' ? 'Supabase' : 'PostgreSQL'} database...`);
  }

  if (!fs.existsSync(sourceSchema)) {
    console.error(`❌ Schema file not found: ${sourceSchema}`);
    process.exit(1);
  }

  if (!fs.existsSync(sourceEnv)) {
    console.error(`❌ Environment file not found: ${sourceEnv}`);
    process.exit(1);
  }

  // Copy the appropriate schema and environment files
  fs.copyFileSync(sourceSchema, CURRENT_SCHEMA);
  fs.copyFileSync(sourceEnv, path.join(SCHEMA_DIR, '..', '.env'));
  
  console.log(`✅ Database schema updated to use ${DB_TYPE === 'sqlite' ? 'SQLite' : 'PostgreSQL'}`);
  console.log(`✅ Environment variables updated`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npx prisma generate');
  
  if (DB_TYPE === 'sqlite') {
    console.log('2. Run: npx prisma db push');
    console.log('3. Run: npx tsx src/seed.ts');
  } else {
    console.log('2. Run: npx prisma db push (or npx prisma migrate dev --name init)');
    console.log('3. Run: npx tsx src/seed.ts');
  }
  
  console.log('4. Restart your API server');
  
} catch (error) {
  console.error('❌ Error switching database:', error.message);
  process.exit(1);
}