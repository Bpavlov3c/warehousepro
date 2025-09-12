-- Add barcode field to products table for inventory tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);

-- Add index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Add comment to document the barcode field purpose
COMMENT ON COLUMN products.barcode IS 'Product barcode for scanning and identification purposes';
