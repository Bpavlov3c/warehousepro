-- Setup script for Warehouse Management System Database

-- Create database (run as postgres superuser)
DROP DATABASE IF EXISTS warehouse_management;
CREATE DATABASE warehouse_management;

-- Create user
DROP USER IF EXISTS warehouse_user;
CREATE USER warehouse_user WITH PASSWORD 'warehouse_secure_2024!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;

-- Connect to the new database
\c warehouse_management;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;

\echo 'Database and user created successfully!'
\echo 'Database: warehouse_management'
\echo 'User: warehouse_user'
\echo 'Password: warehouse_secure_2024!'
