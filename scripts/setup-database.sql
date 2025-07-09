-- Database setup script for Warehouse Management System
-- Run this first to create the database

-- Create database (run this as a superuser)
CREATE DATABASE warehouse_management;

-- Connect to the database
\c warehouse_management;

-- Create a user for the application (optional but recommended)
CREATE USER warehouse_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;
