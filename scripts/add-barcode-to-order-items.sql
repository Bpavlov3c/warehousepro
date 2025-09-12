-- Add barcode field to shopify_order_items table for order item tracking
ALTER TABLE shopify_order_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);

-- Add index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_barcode ON shopify_order_items(barcode);

-- Add comment to document the barcode field purpose
COMMENT ON COLUMN shopify_order_items.barcode IS 'Product barcode for scanning and identification purposes in order items';
