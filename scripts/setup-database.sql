-- Setup script for Warehouse Management System Database

-- Create database (run as postgres superuser)
CREATE DATABASE warehouse_management;

-- Create user
CREATE USER warehouse_user WITH PASSWORD '1';

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

SELECT 'Database setup completed successfully!' as status;
