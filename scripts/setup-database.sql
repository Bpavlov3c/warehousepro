-- Setup script for Warehouse Management System Database
-- This script will use the existing 'postgres' database

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

-- Connect to the postgres database
\c postgres;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;

\echo 'Database user setup completed successfully!'
\echo 'Database: postgres'
\echo 'User: warehouse_user'
\echo 'Password: 1'
