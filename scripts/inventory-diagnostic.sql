-- Diagnostic queries to understand inventory data issues

-- 1. Count total inventory records
SELECT 'Total inventory records' as description, COUNT(*) as count
FROM inventory;

-- 2. Count records with missing SKU or product_name
SELECT 'Records with missing SKU' as description, COUNT(*) as count
FROM inventory 
WHERE sku IS NULL OR sku = '';

SELECT 'Records with missing product_name' as description, COUNT(*) as count
FROM inventory 
WHERE product_name IS NULL OR product_name = '';

-- 3. Count unique SKUs
SELECT 'Unique SKUs' as description, COUNT(DISTINCT sku) as count
FROM inventory
WHERE sku IS NOT NULL AND sku != '';

-- 4. Sample of inventory data
SELECT 'Sample inventory records' as description;
SELECT sku, product_name, quantity_available, unit_cost_with_delivery, created_at
FROM inventory 
WHERE sku IS NOT NULL AND sku != '' AND product_name IS NOT NULL AND product_name != ''
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check for duplicate SKUs and their quantities
SELECT sku, product_name, COUNT(*) as record_count, SUM(quantity_available) as total_quantity
FROM inventory 
WHERE sku IS NOT NULL AND sku != ''
GROUP BY sku, product_name
HAVING COUNT(*) > 1
ORDER BY record_count DESC
LIMIT 10;

-- 6. Check quantity distribution
SELECT 
  CASE 
    WHEN quantity_available = 0 THEN 'Zero quantity'
    WHEN quantity_available < 0 THEN 'Negative quantity'
    WHEN quantity_available BETWEEN 1 AND 10 THEN 'Low stock (1-10)'
    WHEN quantity_available BETWEEN 11 AND 100 THEN 'Medium stock (11-100)'
    ELSE 'High stock (100+)'
  END as stock_level,
  COUNT(*) as count
FROM inventory
GROUP BY 
  CASE 
    WHEN quantity_available = 0 THEN 'Zero quantity'
    WHEN quantity_available < 0 THEN 'Negative quantity'
    WHEN quantity_available BETWEEN 1 AND 10 THEN 'Low stock (1-10)'
    WHEN quantity_available BETWEEN 11 AND 100 THEN 'Medium stock (11-100)'
    ELSE 'High stock (100+)'
  END
ORDER BY count DESC;

-- 7. Check for records with zero or null costs
SELECT 'Records with zero or null unit cost' as description, COUNT(*) as count
FROM inventory 
WHERE unit_cost_with_delivery IS NULL OR unit_cost_with_delivery = 0;

-- 8. Summary by SKU (what the app should be calculating)
SELECT 
  sku,
  product_name,
  COUNT(*) as inventory_records,
  SUM(quantity_available) as total_quantity,
  AVG(unit_cost_with_delivery) as avg_cost,
  MAX(created_at) as latest_record
FROM inventory 
WHERE sku IS NOT NULL AND sku != '' AND product_name IS NOT NULL AND product_name != ''
GROUP BY sku, product_name
ORDER BY total_quantity DESC
LIMIT 20;
