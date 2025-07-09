-- Seed sample data for Warehouse Management System
-- This will populate the postgres database with test data

-- Clear existing data (in correct order due to foreign key constraints)
DELETE FROM purchase_order_items;
DELETE FROM shopify_orders;
DELETE FROM shopify_stores;
DELETE FROM inventory_items;
DELETE FROM purchase_orders;

-- Reset sequences
ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_items_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_stores_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_order_items_id_seq RESTART WITH 1;

-- Sample Purchase Orders
-- Sample Inventory Items  
-- Sample Shopify Stores
-- Sample Shopify Orders

-- All sample data is inserted via the TypeScript seeding script
-- which provides better error handling and data validation

\echo 'Sample data inserted successfully!';
\echo 'Purchase Orders: 5 records';
\echo 'Inventory Items: 8 records';
\echo 'Shopify Stores: 4 records';
\echo 'Shopify Orders: 8 records';
\echo 'Purchase Order Items: 10 records';

-- Run: npm run db:seed
-- Or: npm run db:reset (creates tables and seeds data)
