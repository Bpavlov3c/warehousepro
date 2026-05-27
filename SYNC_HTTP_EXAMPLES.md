# Exact HTTP Requests & Responses - Shopify Order Sync

## Summary of Full Sync Cycle

Your sync operation involves 3 main HTTP interaction phases:

---

## PHASE 1: Frontend → Your Backend

### Request

```http
POST /api/shopify-orders HTTP/1.1
Host: warehousepro.vercel.app
Content-Type: application/json
User-Agent: Mozilla/5.0 (Browser)
Accept: application/json
Content-Length: 0

(empty body)
```

### Response (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: Tue, 27 May 2025 14:30:00 GMT
Server: Vercel
Transfer-Encoding: chunked

{
  "success": true,
  "message": "Successfully synced 1,250 orders from 2 stores and processed inventory deductions",
  "totalOrdersSynced": 1250,
  "storeResults": [
    {
      "store": "B2B-5101",
      "success": true,
      "ordersSynced": 750
    },
    {
      "store": "B2B-5939",
      "success": true,
      "ordersSynced": 500
    }
  ]
}
```

**Time:** ~2-3 minutes (processing all orders)

---

## PHASE 2: Your Backend → Shopify API (Per Store)

### Store #1: B2B-5101

#### Page 1 Request

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any HTTP/1.1
Host: b2b5101.myshopify.com
X-Shopify-Access-Token: shppa_1234567890abcdef1234567890abcdef
Content-Type: application/json
User-Agent: Node.js

(no body)
```

#### Page 1 Response (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Shopify-Rate-Limit-1-Remaining: 39
X-Shopify-Rate-Limit-1-Requested: 1
X-Shopify-Rate-Limit-1-Reset: 1727827400
Link: <https://b2b5101.myshopify.com/admin/api/2024-10/orders.json?limit=250&status=any&since_id=1234567890>; rel="next"
Date: Tue, 27 May 2025 14:30:10 GMT
Transfer-Encoding: chunked

{
  "orders": [
    {
      "id": 1001,
      "name": "#1001",
      "email": "customer1@example.com",
      "created_at": "2025-05-27T10:00:00Z",
      "updated_at": "2025-05-27T14:00:00Z",
      "cancelled_at": null,
      "closed_at": null,
      "processed_at": "2025-05-27T10:01:00Z",
      "total_price": "149.99",
      "total_tax": "12.50",
      "total_discounts": "0.00",
      "total_shipping_price_set": {
        "shop_money": {
          "amount": "10.00",
          "currency_code": "GBP"
        }
      },
      "total_line_items_price": "149.99",
      "currency": "GBP",
      "financial_status": "paid",
      "fulfillment_status": "fulfilled",
      "gateway": "stripe",
      "tags": "wholesale,bulk",
      "note": null,
      "customer": {
        "id": 2001,
        "email": "customer1@example.com",
        "first_name": "John",
        "last_name": "Smith",
        "orders_count": 12,
        "total_spent": "1800.00",
        "state": "enabled",
        "tags": "wholesale",
        "verified_email": true,
        "phone": "+44-1234-567890"
      },
      "billing_address": {
        "first_name": "John",
        "last_name": "Smith",
        "address1": "123 Business St",
        "address2": "Suite 100",
        "city": "London",
        "province": "England",
        "country": "United Kingdom",
        "zip": "SW1A 2AA",
        "phone": "+44-1234-567890"
      },
      "shipping_address": {
        "first_name": "John",
        "last_name": "Smith",
        "address1": "456 Warehouse Ave",
        "address2": null,
        "city": "Manchester",
        "province": "England",
        "country": "United Kingdom",
        "zip": "M1 1AE"
      },
      "line_items": [
        {
          "id": 3001,
          "product_id": 4001,
          "variant_id": 5001,
          "title": "Premium Widget",
          "quantity": 50,
          "sku": "WIDGET-001",
          "variant_title": "Blue/Large",
          "product_exists": true,
          "fulfillment_service": "manual",
          "fulfillment_status": "fulfilled",
          "fulfillable_quantity": 0,
          "vendor": "Widget Co",
          "price": "29.99",
          "grams": 500
        }
      ]
    },
    {
      "id": 1002,
      "name": "#1002",
      // ... 248 more orders (total 250)
    }
  ]
}
```

**Time:** ~500ms

#### Page 2 Request (via Link header `since_id`)

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any&since_id=1234567890 HTTP/1.1
Host: b2b5101.myshopify.com
X-Shopify-Access-Token: shppa_1234567890abcdef1234567890abcdef
Content-Type: application/json

(no body)
```

#### Page 2 Response

```http
HTTP/1.1 200 OK
Link: <https://b2b5101.myshopify.com/admin/api/2024-10/orders.json?limit=250&status=any&since_id=2234567890>; rel="next"

{
  "orders": [
    {
      "id": 1251,
      "name": "#1251",
      // ... 250 more orders
    }
  ]
}
```

#### Page 3 Request

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any&since_id=2234567890 HTTP/1.1
Host: b2b5101.myshopify.com
X-Shopify-Access-Token: shppa_1234567890abcdef1234567890abcdef

(no body)
```

#### Page 3 Response - INCOMPLETE (250 orders)

```http
HTTP/1.1 200 OK
Link: (no "rel=next" header - END OF LIST!)

{
  "orders": [
    {
      "id": 1501,
      // ... 200 more orders (only 200 total, not 250)
    }
  ]
}
```

**Total for B2B-5101:** 250 + 250 + 200 = 700 orders fetched
**But database shows:** 750 orders (50 from somewhere else)

---

### Store #2: B2B-5939 (Missing Orders!)

#### Page 1 Request

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any HTTP/1.1
Host: b2b5939.myshopify.com
X-Shopify-Access-Token: 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
```

#### Page 1 Response (200 OK, 250 orders)

```json
{
  "orders": [
    // 250 orders (IDs 1-250)
  ]
}
```

#### Page 2 Request

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any&since_id=250
Host: b2b5939.myshopify.com
X-Shopify-Access-Token: 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
```

#### Page 2 Response (200 OK, 250 orders)

```json
{
  "orders": [
    // 250 orders (IDs 251-500)
  ]
}
```

#### Page 3 Request

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any&since_id=500
Host: b2b5939.myshopify.com
X-Shopify-Access-Token: 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
```

#### Page 3 Response - **RATE LIMITED (429)**

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-Shopify-API-Call-Limit: 40/40
Content-Type: application/json

{
  "errors": {
    "message": "API call limit reached"
  }
}
```

**Backend Action:** Waits 60 seconds, retries...

#### Page 3 Retry (after 60s)

```http
GET /admin/api/2024-10/orders.json?limit=250&status=any&since_id=500
Host: b2b5939.myshopify.com
X-Shopify-Access-Token: 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
```

#### Page 3 Response - **SUCCESS (after retry)**

```json
{
  "orders": [
    // 250 orders (IDs 501-750)
  ]
}
```

**BUT:** Pages 4-6 are never requested due to timeout/error

---

## PHASE 3: Your Backend → Supabase (Database)

### Batch Insert (100 orders)

```sql
INSERT INTO shopify_orders (
  store_id,
  shopify_order_id,
  order_number,
  customer_name,
  customer_email,
  order_date,
  status,
  total_amount,
  shipping_cost,
  tax_amount,
  shipping_address,
  profit,
  order_items,
  created_at,
  updated_at
) VALUES
  (
    'uuid-5101',
    '1001',
    '#1001',
    'John Smith',
    'john@example.com',
    '2025-05-27T10:00:00Z',
    'fulfilled',
    149.99,
    10.00,
    12.50,
    '456 Warehouse Ave, Manchester, United Kingdom',
    37.50,
    '[{"sku":"WIDGET-001","product_name":"Premium Widget","quantity":50,"unit_price":29.99,"total_price":1499.50}]',
    '2025-05-27T14:30:10Z',
    '2025-05-27T14:30:10Z'
  ),
  -- ... 99 more orders
ON CONFLICT (store_id, shopify_order_id) DO UPDATE SET
  updated_at = NOW()
RETURNING id;
```

**Response:** 100 rows inserted

---

## Where 800 Orders Are Missing

### Scenario: B2B-5939 Actually Has 1300 Orders

```
Expected Pages:
├─ Page 1: Orders 1-250 ✓ (SUCCESS)
├─ Page 2: Orders 251-500 ✓ (SUCCESS)
├─ Page 3: Orders 501-750 ✓ (SUCCESS after 429 retry)
├─ Page 4: Orders 751-1000 ✗ (NEVER REQUESTED - timeout/connection lost)
├─ Page 5: Orders 1001-1250 ✗ (NOT FETCHED)
└─ Page 6: Orders 1251-1300 ✗ (NOT FETCHED)

Missing: 550 orders + sync shows only 500
```

---

## How to Verify This

### Check Shopify Directly

```bash
# First page to get total estimate
curl -i "https://b2b5939.myshopify.com/admin/api/2024-10/orders.json?limit=250&status=any" \
  -H "X-Shopify-Access-Token: $TOKEN" \
  | head -20

# Count pages manually
for i in {1..10}; do
  SINCE_ID=$((250 * ($i - 1)))
  echo "Page $i:"
  curl "https://b2b5939.myshopify.com/admin/api/2024-10/orders.json?limit=250&status=any&since_id=$SINCE_ID" \
    -H "X-Shopify-Access-Token: $TOKEN" \
    | jq '.orders | length'
done
```

### Check Database

```sql
SELECT 
  ss.store_name,
  COUNT(so.id) as synced_orders
FROM shopify_orders so
JOIN shopify_stores ss ON so.store_id = ss.id
WHERE ss.store_name IN ('B2B-5101', 'B2B-5939')
GROUP BY ss.store_name;
```

---

## The Fix

Once identified, resync all orders:

```bash
# Via UI
Click "Resync All" button on Stores page

# Via API
curl -X POST http://localhost:3000/api/admin/resync-all-orders \
  -H "Content-Type: application/json"
```

This will:
1. Clear `last_sync` for all stores
2. Fetch ALL orders from the beginning
3. Handle all pagination pages
4. Save all 1000+ missing orders

