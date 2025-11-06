-- Fix existing order costs using LIFO (Last In, First Out) approach
-- This will update existing sales_fulfillment records to use costs from the most recent purchase orders

-- First, let's create a function to get the most recent unit cost for a SKU based on purchase_date
CREATE OR REPLACE FUNCTION get_latest_unit_cost_by_purchase_date(sku_param text)
RETURNS numeric AS $$
DECLARE
    latest_cost numeric;
BEGIN
    -- Get the most recent unit cost based on purchase_date (LIFO)
    SELECT unit_cost_with_delivery INTO latest_cost
    FROM inventory 
    WHERE sku = sku_param 
    AND unit_cost_with_delivery IS NOT NULL
    ORDER BY purchase_date DESC, created_at DESC
    LIMIT 1;
    
    -- If no inventory record found, try to get from PO items
    IF latest_cost IS NULL THEN
        SELECT poi.unit_cost INTO latest_cost
        FROM po_items poi
        JOIN purchase_orders po ON poi.po_id = po.id
        WHERE poi.sku = sku_param
        ORDER BY po.po_date DESC, poi.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(latest_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Update existing sales_fulfillment records with correct LIFO costs
UPDATE sales_fulfillment sf
SET unit_cost = get_latest_unit_cost_by_purchase_date(
    (SELECT sku FROM shopify_order_items WHERE id = sf.order_item_id)
)
WHERE EXISTS (
    SELECT 1 FROM shopify_order_items soi 
    WHERE soi.id = sf.order_item_id
);

-- Update the specific order mentioned by the user (B2B-4915) if it exists
UPDATE sales_fulfillment sf
SET unit_cost = get_latest_unit_cost_by_purchase_date('TEROA-1072')
WHERE sf.order_item_id IN (
    SELECT soi.id 
    FROM shopify_order_items soi
    JOIN shopify_orders so ON soi.order_id = so.id
    WHERE so.order_number = 'B2B-4915' 
    AND soi.sku = 'TEROA-1072'
);

-- Recalculate profits for all orders using the updated unit costs
UPDATE shopify_orders so
SET profit = (
    SELECT COALESCE(
        SUM((soi.unit_price * soi.quantity) - COALESCE(sf_costs.total_cost, soi.unit_price * soi.quantity * 0.7)), 
        0
    )
    FROM shopify_order_items soi
    LEFT JOIN (
        SELECT 
            sf.order_item_id,
            SUM(sf.unit_cost * sf.quantity_used) as total_cost
        FROM sales_fulfillment sf
        GROUP BY sf.order_item_id
    ) sf_costs ON soi.id = sf_costs.order_item_id
    WHERE soi.order_id = so.id
);

-- Clean up the temporary function
DROP FUNCTION get_latest_unit_cost_by_purchase_date(text);

-- Log the update for the specific order mentioned
DO $$
DECLARE
    order_profit numeric;
    unit_cost_used numeric;
BEGIN
    -- Get the updated profit for order B2B-4915
    SELECT profit INTO order_profit
    FROM shopify_orders 
    WHERE order_number = 'B2B-4915';
    
    -- Get the unit cost now being used for TEROA-1072 in this order
    SELECT sf.unit_cost INTO unit_cost_used
    FROM sales_fulfillment sf
    JOIN shopify_order_items soi ON sf.order_item_id = soi.id
    JOIN shopify_orders so ON soi.order_id = so.id
    WHERE so.order_number = 'B2B-4915' 
    AND soi.sku = 'TEROA-1072'
    LIMIT 1;
    
    RAISE NOTICE 'Order B2B-4915: Updated unit cost for TEROA-1072 to $%, new profit: $%', 
                 COALESCE(unit_cost_used, 0), COALESCE(order_profit, 0);
END $$;
