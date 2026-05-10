# Storage Layer

This directory contains all database-related logic, including connection management, data repositories, and schema migrations.

## Database Migrations

The migration system uses versioned SQL files to manage database schema changes.

- **Location**: Migration files are located in the `src/storage/migrations/` directory.
- **Naming Convention**: Each migration file must be named with a version prefix (e.g., `001_initial_schema.sql`, `002_add_new_table.sql`).
- **Execution**: On application startup, the system automatically executes any new migration files in sequential order. The last applied version is tracked in the `_migrations` table in the database.

### How to Add a New Migration

1.  Create a new SQL file in the `migrations/` directory.
2.  Increment the version number in the filename (e.g., `003_my_new_changes.sql`).
3.  Write the required `ALTER TABLE`, `CREATE TABLE`, etc., statements in the file.
