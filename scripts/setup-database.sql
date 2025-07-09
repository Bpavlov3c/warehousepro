-- Setup script for warehouse management system
-- This creates the necessary database structure

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'warehouse_user') THEN
        CREATE USER warehouse_user WITH PASSWORD '1';
    END IF;
END
$$;

-- Grant privileges on postgres database
GRANT ALL PRIVILEGES ON DATABASE postgres TO warehouse_user;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;

-- Make warehouse_user a superuser for development (optional, for easier development)
-- ALTER USER warehouse_user WITH SUPERUSER;

-- Create tables will be handled by the TypeScript script
-- This file is kept for reference and manual setup if needed

-- You can run the TypeScript scripts instead:
-- npm run db:create  (creates tables)
-- npm run db:seed   (adds sample data)
-- npm run db:reset  (does both)

\echo 'Database setup completed successfully!'
\echo 'User: warehouse_user'
\echo 'Database: postgres'
\echo 'Password: 1'
