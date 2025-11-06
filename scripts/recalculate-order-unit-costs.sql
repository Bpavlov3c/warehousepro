-- Script to recalculate and update unit costs for existing orders
-- This will update the sales_fulfillment table with correct unit costs based on the most recent PO

-- First, let's create a function to get the latest unit cost for a SKU based on purchase date
CREATE OR REPLACE FUNCTION get_latest_unit_cost_by_purchase_date(sku_param TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    latest_cost DECIMAL(10,2);
BEGIN
    -- Get the unit cost from the most recent purchase date for this SKU
    SELECT unit_cost_with_delivery INTO latest_cost
    FROM inventory 
    WHERE sku = sku_param 
    AND quantity_available > 0
    ORDER BY purchase_date DESC, created_at DESC
    LIMIT 1;
    
    -- If no inventory record found, try to get from PO items with most recent purchase date
    IF latest_cost IS NULL THEN
        SELECT poi.unit_cost INTO latest_cost
        FROM po_items poi
        JOIN purchase_orders po ON poi.po_id = po.id
        WHERE poi.sku = sku_param
        ORDER BY po.po_date DESC, po.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(latest_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Update existing sales_fulfillment records with corrected unit costs
UPDATE sales_fulfillment sf
SET unit_cost = get_latest_unit_cost_by_purchase_date(
    (SELECT soi.sku 
     FROM shopify_order_items soi 
     WHERE soi.id = sf.order_item_id)
)
WHERE sf.unit_cost != get_latest_unit_cost_by_purchase_date(
    (SELECT soi.sku 
     FROM shopify_order_items soi 
     WHERE soi.id = sf.order_item_id)
);

-- Update shopify_orders profit calculations based on corrected unit costs
UPDATE shopify_orders so
SET profit = (
    -- Calculate profit: total_amount - tax_amount - shipping_cost - total_item_costs
    COALESCE(so.total_amount, 0) - 
    COALESCE(so.tax_amount, 0) - 
    COALESCE(so.shipping_cost, 0) - 
    (
        SELECT COALESCE(SUM(sf.quantity_used * sf.unit_cost), 0)
        FROM sales_fulfillment sf
        JOIN shopify_order_items soi ON sf.order_item_id = soi.id
        WHERE soi.order_id = so.id
    )
)
WHERE EXISTS (
    SELECT 1 
    FROM shopify_order_items soi 
    WHERE soi.order_id = so.id
);

-- For orders that don't have sales_fulfillment records yet, calculate profit using latest unit costs
UPDATE shopify_orders so
SET profit = (
    COALESCE(so.total_amount, 0) - 
    COALESCE(so.tax_amount, 0) - 
    COALESCE(so.shipping_cost, 0) - 
    (
        SELECT COALESCE(SUM(soi.quantity * get_latest_unit_cost_by_purchase_date(soi.sku)), 0)
        FROM shopify_order_items soi
        WHERE soi.order_id = so.id
    )
)
WHERE NOT EXISTS (
    SELECT 1 
    FROM shopify_order_items soi 
    JOIN sales_fulfillment sf ON sf.order_item_id = soi.id
    WHERE soi.order_id = so.id
);

-- Create sales_fulfillment records for orders that don't have them yet
-- This will use the corrected FIFO logic for future consistency
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost)
SELECT 
    soi.id as order_item_id,
    (SELECT i.id 
     FROM inventory i 
     WHERE i.sku = soi.sku 
     ORDER BY i.purchase_date DESC, i.created_at DESC 
     LIMIT 1) as inventory_id,
    soi.quantity as quantity_used,
    get_latest_unit_cost_by_purchase_date(soi.sku) as unit_cost
FROM shopify_order_items soi
WHERE NOT EXISTS (
    SELECT 1 
    FROM sales_fulfillment sf 
    WHERE sf.order_item_id = soi.id
)
AND EXISTS (
    SELECT 1 
    FROM inventory i 
    WHERE i.sku = soi.sku
);

-- Clean up the temporary function
DROP FUNCTION IF EXISTS get_latest_unit_cost_by_purchase_date(TEXT);

-- Show summary of updated records
SELECT 
    'Sales Fulfillment Records Updated' as operation,
    COUNT(*) as count
FROM sales_fulfillment
UNION ALL
SELECT 
    'Orders with Updated Profit' as operation,
    COUNT(*) as count
FROM shopify_orders
WHERE profit IS NOT NULL;
