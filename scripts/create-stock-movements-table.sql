-- Create stock_movements table to track inventory changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku VARCHAR NOT NULL,
  product_name VARCHAR,
  movement_type VARCHAR NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'reserved', 'unreserved')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR, -- 'purchase_order', 'sale', 'return', 'adjustment', 'reservation'
  reference_id UUID, -- ID of the related record (PO, order, etc.)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_sku ON stock_movements(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- Add RLS policies
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all stock movements
CREATE POLICY "Allow authenticated users to read stock movements" ON stock_movements
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert stock movements
CREATE POLICY "Allow authenticated users to insert stock movements" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add columns to inventory table to track reserved stock
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_reserved INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_incoming INTEGER DEFAULT 0;

-- Update the product_inventory_summary view to include reserved and incoming stock
DROP VIEW IF EXISTS product_inventory_summary;
CREATE VIEW product_inventory_summary AS
SELECT 
  p.sku,
  p.product_name,
  COALESCE(SUM(i.quantity_available), 0) as current_stock,
  COALESCE(SUM(i.quantity_reserved), 0) as reserved_stock,
  COALESCE(SUM(i.quantity_incoming), 0) as incoming_stock,
  COALESCE(AVG(i.unit_cost_with_delivery), 0) as avg_cost,
  COALESCE(SUM(i.quantity_available * i.unit_cost_with_delivery), 0) as total_value,
  p.min_stock,
  p.max_stock
FROM products p
LEFT JOIN inventory i ON p.sku = i.sku
GROUP BY p.sku, p.product_name, p.min_stock, p.max_stock;
