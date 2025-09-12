-- Add barcode field to po_items table for purchase order item tracking
ALTER TABLE po_items ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);

-- Add index on barcode for faster lookups
CREATE INDEX IF NOT EXISTS idx_po_items_barcode ON po_items(barcode);

-- Add comment to document the barcode field purpose
COMMENT ON COLUMN po_items.barcode IS 'Product barcode for scanning and identification purposes in purchase orders';
