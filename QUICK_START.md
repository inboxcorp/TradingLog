# Quick Start - Database Testing Guide

## ✅ Current Setup
Your Trading Log application is now configured with **dual database support**:

- **SQLite**: For local development (currently active)
- **Supabase**: For cloud/production use

## 🚀 Test Both Databases

### 1. Test Current SQLite Setup
```bash
cd apps/api

# Check current status
npm run db:status

# Test connection 
npm run db:test

# Test API endpoint
curl -H "Authorization: Bearer dev-token" http://localhost:3001/api/trades
```

### 2. Switch to Supabase and Test
```bash
# Switch to Supabase (includes schema + environment)
npm run db:switch:supabase

# Generate Prisma client for PostgreSQL
npx prisma generate

# Check connection (your Supabase project needs to be active)
npm run db:test

# If connection works, sync schema
npx prisma db push

# Add seed data if needed
npm run db:seed

# Test API endpoint
curl -H "Authorization: Bearer dev-token" http://localhost:3001/api/trades
```

### 3. Switch Back to SQLite
```bash
# Switch back to SQLite
npm run db:switch:sqlite

# Generate client and test
npx prisma generate
npm run db:test

# Test API
curl -H "Authorization: Bearer dev-token" http://localhost:3001/api/trades
```

## 🔧 Available Commands

```bash
# Database Switching
npm run db:switch:sqlite     # Switch to SQLite
npm run db:switch:supabase   # Switch to Supabase  

# Complete Setup (switch + generate + push + seed)
npm run db:setup:sqlite      # Complete SQLite setup
npm run db:setup:supabase    # Complete Supabase setup

# Database Management
npm run db:status            # Show current database type
npm run db:test              # Test current connection
npm run db:seed              # Add seed data
npm run db:studio            # Open Prisma Studio

# Standard Prisma Commands
npx prisma generate          # Generate client
npx prisma db push           # Push schema to database
npx prisma migrate dev       # Create and apply migration
```

## 📊 What Each Database Contains

### SQLite (Local)
- **Location**: `apps/api/prisma/dev.db`
- **Contains**: Local test data
- **User**: dev-user-1 with $10,000 equity
- **Trades**: Sample trade data

### Supabase (Cloud)
- **Location**: Cloud PostgreSQL database
- **Contains**: Your existing production/test data  
- **User**: Same dev-user-1 (if seeded)
- **Trades**: Any trades created in cloud environment

## 🌐 Web Application

The web app automatically works with whichever database is currently active:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Authentication**: Uses dev-token in development mode

## ⚠️ Important Notes

1. **Restart API Server**: After switching databases, restart your API server for changes to take effect
2. **Supabase Status**: Make sure your Supabase project is not paused
3. **Data Isolation**: SQLite and Supabase have separate data - switching doesn't sync between them
4. **Environment Files**: Switching automatically manages `.env` files for you

## 🎯 What to Test

1. ✅ **SQLite is working** (current setup)
2. 🔄 **Switch to Supabase** 
3. ✅ **Test Supabase connectivity**
4. 🔄 **Switch back to SQLite**
5. 🎉 **Both databases work independently**

You now have a complete dual-database setup that lets you develop locally with SQLite and deploy/test with Supabase PostgreSQL!