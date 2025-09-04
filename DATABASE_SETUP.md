# Database Setup Guide

This guide explains how to switch between SQLite (local) and Supabase (PostgreSQL) databases for your Trading Log application.

## Current Status

- ✅ **SQLite Setup**: Working locally with seed data
- ✅ **Supabase Setup**: Ready to use (contains existing data)
- ✅ **Switching System**: Complete with automatic environment management

## Quick Switch Commands

### Switch to SQLite (Local Development)
```bash
cd apps/api
npm run db:setup:sqlite
```

### Switch to Supabase (Cloud Database)
```bash
cd apps/api
npm run db:setup:supabase
```

## Manual Setup Steps

### Option 1: SQLite (Local Development)
1. **Switch to SQLite schema:**
   ```bash
   npm run db:switch:sqlite
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Apply schema to database:**
   ```bash
   npx prisma db push
   ```

4. **Seed with test data:**
   ```bash
   npm run db:seed
   ```

5. **Restart API server**

### Option 2: Supabase (Cloud Database)

#### Prerequisites
1. **Verify your Supabase project is active:**
   - Go to https://supabase.com/dashboard
   - Check if project `xpqwkmqlprchadcjqrgs` is running
   - If paused, click "Resume" to start it

2. **Check your connection settings in `.env`:**
   ```
   DATABASE_URL="postgresql://postgres:kYvbgPwYaeRicuqg@db.xpqwkmqlprchadcjqrgs.supabase.co:5432/postgres?sslmode=require"
   SUPABASE_URL="https://xpqwkmqlprchadcjqrgs.supabase.co"
   SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

#### Setup Steps
1. **Switch to PostgreSQL schema:**
   ```bash
   npm run db:switch:supabase
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Apply schema to Supabase:**
   ```bash
   npx prisma db push
   ```
   *Note: If this fails, your Supabase project might be paused*

4. **Seed with test data:**
   ```bash
   npm run db:seed
   ```

5. **Restart API server**

## Testing the Setup

### 1. Test API Connection
```bash
# Health check
curl http://localhost:3001/health

# Test trades endpoint (should return empty array initially)
curl -H "Authorization: Bearer dev-token" http://localhost:3001/api/trades
```

### 2. Test Database with Prisma Studio
```bash
npx prisma studio
```
This opens a web interface to view your database.

### 3. Check Database Contents
```bash
# For SQLite
sqlite3 prisma/dev.db "SELECT * FROM User;"

# For PostgreSQL (if you have psql installed)
psql postgresql://postgres:kYvbgPwYaeRicuqg@db.xpqwkmqlprchadcjqrgs.supabase.co:5432/postgres -c "SELECT * FROM \"User\";"
```

## Troubleshooting

### Supabase Connection Issues

1. **Project Paused**: 
   - Go to https://supabase.com/dashboard
   - Find your project and click "Resume"

2. **Wrong Credentials**:
   - Verify your `.env` file has the correct DATABASE_URL
   - Check if password has expired

3. **Network Issues**:
   - Try connecting from Supabase dashboard first
   - Check firewall/VPN settings

### SQLite Issues

1. **Permission Problems**:
   ```bash
   chmod 666 prisma/dev.db
   ```

2. **Database Locked**:
   - Stop all running processes
   - Delete `prisma/dev.db` and recreate with `npx prisma db push`

## File Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma          # Current active schema
│   ├── schema.sqlite.prisma   # SQLite version
│   ├── schema.postgresql.prisma # PostgreSQL version
│   ├── dev.db                # SQLite database file
│   └── test.db               # Test database file
├── scripts/
│   └── switch-db.js          # Database switching script
└── src/
    └── seed.ts               # Database seeding script
```

## Environment Variables

The application uses these environment variables (in `.env`):

```bash
# Database Connection
DATABASE_URL="..." # Automatically used by Prisma

# Supabase Configuration  
SUPABASE_URL="https://xpqwkmqlprchadcjqrgs.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."
SUPABASE_JWT_SECRET="..."

# API Configuration
PORT=3001
NODE_ENV=development
```

## Next Steps

1. **For SQLite**: You're already set up and ready to go!
2. **For Supabase**: Check your Supabase dashboard to ensure the project is active, then run the setup commands above.

Both databases will work with the same API and web application - no code changes needed!