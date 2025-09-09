-- Script to sync missing inventory records from purchase orders
-- This will create inventory records for SKUs that exist in purchase orders but not in inventory

-- First, let's see what's missing
SELECT DISTINCT pi.sku, pi.product_name, pi.unit_cost, po.delivery_cost, po.po_date
FROM po_items pi
JOIN purchase_orders po ON pi.po_id = po.id
WHERE pi.sku NOT IN (SELECT DISTINCT sku FROM inventory WHERE sku IS NOT NULL)
ORDER BY po.po_date DESC;

-- Create missing inventory records with calculated unit costs including delivery
INSERT INTO inventory (sku, product_name, po_id, quantity_available, unit_cost_with_delivery, purchase_date)
SELECT DISTINCT ON (pi.sku)
    pi.sku,
    COALESCE(pi.product_name, pi.sku) as product_name,
    po.id as po_id,
    pi.quantity as quantity_available,
    CASE 
        WHEN po.delivery_cost > 0 AND pi.quantity > 0 
        THEN pi.unit_cost + (po.delivery_cost / pi.quantity)
        ELSE pi.unit_cost
    END as unit_cost_with_delivery,
    po.po_date as purchase_date
FROM po_items pi
JOIN purchase_orders po ON pi.po_id = po.id
WHERE pi.sku NOT IN (SELECT DISTINCT sku FROM inventory WHERE sku IS NOT NULL)
    AND pi.sku IS NOT NULL
    AND pi.unit_cost IS NOT NULL
ORDER BY pi.sku, po.po_date DESC;

-- Verify the results
SELECT COUNT(*) as records_created FROM inventory 
WHERE created_at >= NOW() - INTERVAL '1 minute';
