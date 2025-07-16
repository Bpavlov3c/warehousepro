-- Debug script to investigate inventory cost discrepancies
-- This will help identify items where the inventory unit cost doesn't match the expected PO calculation

-- First, let's see all inventory records with their PO information
SELECT 
    i.sku,
    i.product_name,
    i.quantity_available,
    i.unit_cost_with_delivery as inventory_unit_cost,
    i.purchase_date,
    po.po_number,
    po.delivery_cost,
    poi.unit_cost as po_base_unit_cost,
    poi.quantity as po_quantity,
    poi.total_cost as po_line_total,
    -- Calculate what the unit cost should be
    CASE 
        WHEN po.delivery_cost > 0 THEN
            poi.unit_cost + (po.delivery_cost * (poi.unit_cost * poi.quantity) / 
                (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id)) / poi.quantity
        ELSE poi.unit_cost
    END as calculated_unit_cost
FROM inventory i
LEFT JOIN purchase_orders po ON i.po_id = po.id
LEFT JOIN po_items poi ON po.id = poi.po_id AND i.sku = poi.sku
WHERE i.po_id IS NOT NULL
ORDER BY i.sku, i.created_at DESC;

-- Show discrepancies where inventory cost doesn't match calculated cost
WITH cost_comparison AS (
    SELECT 
        i.sku,
        i.product_name,
        i.unit_cost_with_delivery as inventory_unit_cost,
        po.po_number,
        po.delivery_cost,
        poi.unit_cost as po_base_unit_cost,
        poi.quantity as po_quantity,
        -- Calculate what the unit cost should be
        CASE 
            WHEN po.delivery_cost > 0 THEN
                poi.unit_cost + (po.delivery_cost * (poi.unit_cost * poi.quantity) / 
                    (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id)) / poi.quantity
            ELSE poi.unit_cost
        END as calculated_unit_cost
    FROM inventory i
    LEFT JOIN purchase_orders po ON i.po_id = po.id
    LEFT JOIN po_items poi ON po.id = poi.po_id AND i.sku = poi.sku
    WHERE i.po_id IS NOT NULL
)
SELECT 
    sku,
    product_name,
    po_number,
    inventory_unit_cost,
    calculated_unit_cost,
    ABS(inventory_unit_cost - calculated_unit_cost) as difference,
    CASE 
        WHEN ABS(inventory_unit_cost - calculated_unit_cost) > 0.01 THEN 'MISMATCH'
        ELSE 'OK'
    END as status
FROM cost_comparison
WHERE ABS(inventory_unit_cost - calculated_unit_cost) > 0.01
ORDER BY difference DESC;

-- Specific check for SILLO-01890
SELECT 
    i.sku,
    i.product_name,
    i.unit_cost_with_delivery as inventory_unit_cost,
    po.po_number,
    po.delivery_cost,
    poi.unit_cost as po_base_unit_cost,
    poi.quantity as po_quantity,
    poi.total_cost as po_line_total,
    -- Calculate subtotal for this PO
    (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id) as po_subtotal,
    -- Calculate proportion
    (poi.unit_cost * poi.quantity) / (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id) as item_proportion,
    -- Calculate shipping for this item
    po.delivery_cost * ((poi.unit_cost * poi.quantity) / (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id)) as shipping_for_item,
    -- Calculate shipping per unit
    (po.delivery_cost * ((poi.unit_cost * poi.quantity) / (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id))) / poi.quantity as shipping_per_unit,
    -- Calculate total unit cost
    poi.unit_cost + ((po.delivery_cost * ((poi.unit_cost * poi.quantity) / (SELECT SUM(unit_cost * quantity) FROM po_items WHERE po_id = po.id))) / poi.quantity) as calculated_total_unit_cost
FROM inventory i
LEFT JOIN purchase_orders po ON i.po_id = po.id
LEFT JOIN po_items poi ON po.id = poi.po_id AND i.sku = poi.sku
WHERE i.sku = 'SILLO-01890'
ORDER BY i.created_at DESC;
