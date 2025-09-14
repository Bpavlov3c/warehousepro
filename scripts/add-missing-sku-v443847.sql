-- Add missing SKU V-443847 to products and inventory tables
-- This SKU was found in PO but missing from inventory

-- First, add to products table if it doesn't exist
INSERT INTO products (id, sku, product_name, description, barcode, min_stock, max_stock, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'V-443847',
  'Product V-443847', -- You can update this with the actual product name
  'Product added from PO delivery - please update description',
  'V-443847', -- Using SKU as barcode for now
  5, -- Default min stock
  100, -- Default max stock
  NOW(),
  NOW()
)
ON CONFLICT (sku) DO NOTHING; -- Don't insert if SKU already exists

-- Add to inventory table with zero quantity initially
-- You'll need to update this with actual received quantity
INSERT INTO inventory (
  id,
  sku,
  product_name,
  quantity_available,
  original_unit_cost,
  unit_cost_with_delivery,
  original_currency,
  purchase_date,
  po_id,
  created_at
)
SELECT 
  gen_random_uuid(),
  'V-443847',
  'Product V-443847',
  0, -- Set to 0 initially, update with actual received quantity
  0.00, -- Update with actual cost from PO
  0.00, -- Update with actual cost including delivery
  'USD', -- Update with actual currency
  CURRENT_DATE,
  po.id, -- Link to the PO that contains this SKU
  NOW()
FROM purchase_orders po
WHERE po.po_number IN (
  SELECT DISTINCT po.po_number 
  FROM purchase_orders po
  JOIN po_items pi ON po.id = pi.po_id
  WHERE pi.sku = 'V-443847'
)
LIMIT 1
ON CONFLICT (sku, po_id) DO NOTHING;
