-- Add field to track if orders have been processed for inventory deduction
ALTER TABLE shopify_orders 
ADD COLUMN inventory_processed BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX idx_shopify_orders_inventory_processed ON shopify_orders(inventory_processed);

-- Add index for order_date filtering
CREATE INDEX idx_shopify_orders_order_date ON shopify_orders(order_date);

-- Mark all existing orders as processed so we only process new ones
UPDATE shopify_orders 
SET inventory_processed = TRUE 
WHERE order_date < '2025-07-17';
