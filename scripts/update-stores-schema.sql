-- Add columns to support Open API stores
ALTER TABLE shopify_stores 
ADD COLUMN IF NOT EXISTS store_type VARCHAR(20) DEFAULT 'shopify',
ADD COLUMN IF NOT EXISTS api_endpoint TEXT;

-- Update existing records to have the correct store_type
UPDATE shopify_stores SET store_type = 'shopify' WHERE store_type IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_stores_store_type ON shopify_stores(store_type);
