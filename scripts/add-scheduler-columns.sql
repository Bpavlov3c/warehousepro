-- Migration: Add scheduler columns to shopify_stores table
-- Description: Enable per-store daily sync scheduling with customizable hours
-- Date: 2024

ALTER TABLE shopify_stores
ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_schedule_hour integer DEFAULT 1 CHECK (sync_schedule_hour >= 0 AND sync_schedule_hour <= 23),
ADD COLUMN IF NOT EXISTS last_scheduled_sync timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_scheduled_sync timestamp with time zone;

-- Create index for faster queries on sync_enabled stores
CREATE INDEX IF NOT EXISTS idx_shopify_stores_sync_enabled ON shopify_stores(sync_enabled) WHERE sync_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN shopify_stores.sync_enabled IS 'Enable or disable daily automatic sync for this store';
COMMENT ON COLUMN shopify_stores.sync_schedule_hour IS 'Hour (0-23 UTC) when daily sync should occur';
COMMENT ON COLUMN shopify_stores.last_scheduled_sync IS 'Timestamp of the last scheduled sync execution';
COMMENT ON COLUMN shopify_stores.next_scheduled_sync IS 'Predicted timestamp of the next scheduled sync';
