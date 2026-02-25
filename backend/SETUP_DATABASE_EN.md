# Database Setup

## Problem
The migration failed because PostgreSQL is not accessible.

## Solutions

### Option 1: Start PostgreSQL (macOS with Homebrew)

```bash
# Start PostgreSQL
brew services start postgresql@14
# or
brew services start postgresql@15
# or
brew services start postgresql@16

# Verify it's started
pg_isready
```

### Option 2: Start PostgreSQL (macOS with Postgres.app)

If you're using Postgres.app, simply launch the application.

### Option 3: Create the Database

Once PostgreSQL is started, create the database:

```bash
# Connect to PostgreSQL
psql postgres

# In the PostgreSQL terminal, execute:
CREATE DATABASE carindex;
\q
```

### Option 4: Use Docker

```bash
# Start PostgreSQL with Docker
docker run --name carindex-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=carindex \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for PostgreSQL to start
sleep 5
```

## Run the Migration

Once PostgreSQL is started and the database is created:

```bash
cd backend
node src/scripts/run-migration.js
```

## Verify Configuration

Make sure your `.env` file contains:

```env
DATABASE_URL=postgresql://localhost:5432/carindex
```

If you're using a different user/password:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/carindex
```

## Initialize Base Schema

If this is the first time, also initialize the main schema:

```bash
cd backend
node src/scripts/init-db.js
```

Then run the migration:

```bash
node src/scripts/run-migration.js
```
