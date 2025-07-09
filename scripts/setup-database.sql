-- Database setup script for Warehouse Management System
-- Run this first to create the database and user

-- Create database (run this as postgres superuser)
CREATE DATABASE warehouse_management;

-- Connect to the database
\c warehouse_management;

-- Create a user for the application
CREATE USER warehouse_user WITH PASSWORD 'warehouse_secure_2024!';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Show connection info
SELECT 'Database setup completed successfully!' as status;
SELECT current_database() as database_name, current_user as current_user;
