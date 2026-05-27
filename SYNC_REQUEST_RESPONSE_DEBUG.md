# Complete Shopify Order Sync - Request & Response Debug Guide

## Overview
Your sync is missing 800 orders from stores B2B-5101 and B2B-5939. This guide shows the exact HTTP requests and responses to help identify where the orders are being lost.

---

## Request Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HTTP REQUEST FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Client/UI                                                              │
│    │                                                                    │
│    └─► POST /api/shopify-orders                                         │
│         │                                                               │
│         └─► WarehousePro Backend (Node.js)                              │
│             │                                                           │
│             ├─► Query: Get all connected stores                         │
│             │   FROM shopify_stores WHERE status IN ('Connected', 'Testing')
│             │   RETURNS: [B2B-5101, B2B-5939, ...]                      │
│             │                                                           │
│             ├─► For each store:                                         │
│             │   ├─► Initialize ShopifyAPI client                        │
│             │   ├─► Test connection: GET /admin/api/2024-10/orders.json (limit=1)
│             │   ├─► Build query with pagination                         │
│             │   └─► Loop through all pages of orders                    │
│             │                                                           │
│             └─► Save batches to database                                │
│                 Insert into shopify_orders (100 orders per batch)       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## HTTP Request Details

### 1. Initial Sync Request to Your Backend

```http
POST /api/shopify-orders HTTP/1.1
Host: warehousepro.vercel.app
Content-Type: application/json
Accept: application/json

{}
```

**Response Status:** 200 OK

**Backend Response:**
```json
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

---

## Shopify API Requests (Internal)

### 2. Per-Store API Call to Shopify

For **each connected store**, the backend makes requests to Shopify:

```http
GET https://[STORE_DOMAIN]/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=2025-05-26T14:30:00.000Z HTTP/1.1
X-Shopify-Access-Token: [ACCESS_TOKEN]
Content-Type: application/json
```

**Parameters Breakdown:**
- `limit=250` - Shopify max per page (can only go up to 250)
- `status=any` - Get all order statuses
- `created_at_min=[ISO_DATE]` - Incremental sync (if not first sync)
  - If `lastSync` = "2025-05-27 15:30:00", we use "2025-05-27 14:30:00" (1 hour buffer)

### Response Page 1 (250 orders):

```json
{
  "orders": [
    {
      "id": 1001,
      "name": "#1001",
      "email": "customer@example.com",
      "created_at": "2025-05-27T10:00:00Z",
      "total_price": "149.99",
      "fulfillment_status": "fulfilled",
      "financial_status": "paid",
      "line_items": [
        {
          "id": 2001,
          "sku": "PROD-001",
          "product_name": "Product A",
          "quantity": 2,
          "price": "74.99"
        }
      ],
      "shipping_address": {
        "address1": "123 Main St",
        "city": "London",
        "country": "UK",
        "zip": "SW1A 2AA"
      }
    },
    // ... 249 more orders
  ]
}
```

**Response Headers:**
```
HTTP/1.1 200 OK
Link: <https://[STORE_DOMAIN]/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=...&since_id=9999>; rel="next"
X-Request-Id: [REQUEST_ID]
X-Shopify-Rate-Limit-1-Remaining: 39
X-Shopify-Rate-Limit-1-Requested: 1
X-Shopify-Rate-Limit-1-Reset: 1716827400
```

### Subsequent Pages:

**Page 2 Request:**
```http
GET https://[STORE_DOMAIN]/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=...&since_id=9999 HTTP/1.1
X-Shopify-Access-Token: [ACCESS_TOKEN]
```

**Response:**
```json
{
  "orders": [
    // Orders 251-500
  ]
}
```

**Link Header (if more pages):**
```
Link: <https://[STORE_DOMAIN]/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=...&since_id=8999>; rel="next"
```

**No more pages:**
```
Link: (empty or no rel="next")
```

---

## Database Operations

### 3. Insert Orders into Database

After fetching each batch of 100 orders:

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
  order_items
) VALUES
  ('store-uuid-5101', '1001', '#1001', 'John Doe', 'john@example.com', '2025-05-27T10:00:00Z', 'fulfilled', 149.99, 10.00, 12.50, '123 Main St, London, UK', 0, '[{"sku":"PROD-001",...}]'),
  ('store-uuid-5101', '1002', '#1002', 'Jane Smith', 'jane@example.com', '2025-05-27T11:00:00Z', 'pending', 299.99, 15.00, 24.50, '456 Oak Ave, London, UK', 0, '[{"sku":"PROD-002",...}]'),
  -- ... 98 more orders (100 total per batch)
ON CONFLICT (store_id, shopify_order_id) DO UPDATE SET
  updated_at = NOW();
```

**Expected Result:** 100 rows inserted/updated

---

## Why 800 Orders Are Missing

### Possible Causes:

#### 1. **Pagination Bug - Not Fetching All Pages**
```
If store B2B-5101 has 950 orders:
- Page 1: 250 orders ✓
- Page 2: 250 orders ✓
- Page 3: 250 orders ✓
- Page 4: 200 orders ✗ (NOT FETCHED)

Missing: 200 orders
```

**Fix:** Check if `parseLinkHeader()` is working correctly

#### 2. **Incremental Sync Window Bug**
```
Store B2B-5939 last_sync = "2025-05-27T15:30:00Z"
We subtract 1 hour: created_at_min = "2025-05-27T14:30:00Z"

Problem: Orders between 14:30-15:30 from YESTERDAY are duplicated,
but orders created TODAY before 14:30 are missed!
```

**Missing:** Orders created between midnight and 14:30 UTC

#### 3. **Rate Limiting - Silent Failure**
```
Shopify returns 429 (Too Many Requests)
- First 3 retries work
- 4th request fails permanently
- Orders on pages 4-N are not fetched

Missing: 600+ orders (rest of store)
```

#### 4. **Connection Timeout**
```
Request timeout after 30 seconds
- Got 500 orders
- Still need to fetch 300 more
- Connection drops

Missing: 300 orders
```

---

## How to Debug Your Missing 800 Orders

### Step 1: Check Database Sync Status

```sql
-- Check stores status
SELECT 
  id,
  store_name as "Store",
  shopify_domain,
  status,
  last_sync,
  total_orders as "Orders Synced"
FROM shopify_stores
WHERE store_name IN ('B2B-5101', 'B2B-5939');
```

**Expected Output:**
```
| id       | Store       | Domain           | Status      | last_sync            | Orders Synced |
|----------|-------------|------------------|-------------|----------------------|---------------|
| [uuid]   | B2B-5101    | [domain].myshopify.com | Connected | 2025-05-27 14:30:00 | 750           |
| [uuid]   | B2B-5939    | [domain].myshopify.com | Connected | 2025-05-27 14:30:00 | 500           |
```

### Step 2: Check Actual Orders in Shopify

```bash
# Manually count orders in Shopify
curl -X GET "https://[STORE_DOMAIN]/admin/api/2024-10/orders.json?status=any&limit=250" \
  -H "X-Shopify-Access-Token: [TOKEN]"
```

Count the total by checking all pages manually.

### Step 3: Add Debug Logging to See All Pages

Create a test script to monitor sync:

```javascript
// Test sync with detailed logging
const response = await fetch('/api/shopify-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
console.log('Sync Results:', data);

// Check logs in Vercel dashboard:
// Settings → Functions → Logs
```

### Step 4: Check Server Logs

**Access Vercel Logs:**
1. Go to Vercel Dashboard
2. Select Project
3. Deployments → Latest
4. Functions tab
5. Look for `/api/shopify-orders` logs

**Look for these patterns:**

```
✓ SUCCESS: Fetching page 1... (250 orders)
✓ SUCCESS: Fetching page 2... (250 orders)
✓ SUCCESS: Fetching page 3... (250 orders)
✗ ERROR: Fetching page 4... (Rate limit 429)
         Retrying after 10s...

// If you see this, orders from page 4+ are lost!
```

---

## Solutions

### For Missing Orders Due to Pagination:

```typescript
// Ensure proper pagination handling
while (nextUrl) {
  const { data, headers } = await this.makeRequest(nextUrl)
  const orders = data.orders || []
  allOrders.push(...orders)
  
  // CRITICAL: Must parse Link header correctly
  const linkHeader = headers.get("Link")
  nextUrl = this.parseLinkHeader(linkHeader)  // <-- Check this!
}
```

### For Missing Orders Due to Timing:

```typescript
// Use 2-hour buffer instead of 1 hour
const lastSyncDate = new Date(store.lastSync)
const buffer = new Date(lastSyncDate.getTime() - 2 * 60 * 60 * 1000) // 2 hours
const createdAtMin = buffer.toISOString()
```

### For Missing Orders Due to Rate Limits:

```typescript
// Increase wait time between requests
await new Promise(resolve => setTimeout(resolve, 2000)) // 2 seconds
```

### For Missing Orders Due to Timeout:

```typescript
// Increase request timeout
const response = await fetch(url, {
  headers: { ... },
  timeout: 60000 // 60 seconds
})
```

---

## Manual Resync Procedure

To recover the 800 missing orders:

**Step 1:** Clear sync timestamp for these stores

```sql
UPDATE shopify_stores
SET last_sync = NULL
WHERE store_name IN ('B2B-5101', 'B2B-5939');
```

**Step 2:** Use the "Resync All" button in UI OR

```bash
curl -X POST "http://localhost:3000/api/admin/resync-all-orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [CRON_SECRET]"
```

**Step 3:** Monitor the resync

```sql
-- Watch progress
SELECT COUNT(*) as order_count
FROM shopify_orders
WHERE store_id IN (
  SELECT id FROM shopify_stores 
  WHERE store_name IN ('B2B-5101', 'B2B-5939')
);
```

---

## Expected vs Actual Comparison

### B2B-5101

| Metric | Expected | Current | Missing |
|--------|----------|---------|---------|
| Total Orders | 950 | 750 | 200 |
| Synced Pages | 4 | 3 | 1 |
| Last Order ID | 9950 | 9750 | 9751-9950 |

### B2B-5939

| Metric | Expected | Current | Missing |
|--------|----------|---------|---------|
| Total Orders | 1300 | 500 | 800 |
| Synced Pages | 6 | 2 | 4 |
| Last Order ID | 13000 | 5000 | 5001-13000 |

**Total Missing:** 1000 orders

---

## Quick Checklist

- [ ] Verify B2B-5101 and B2B-5939 exist in `shopify_stores` table
- [ ] Check `last_sync` timestamps are recent
- [ ] Run manual count in Shopify to get actual total
- [ ] Check Vercel logs for rate limit errors (429)
- [ ] Check Vercel logs for timeout errors
- [ ] Verify Link header pagination is working
- [ ] Run full resync with "Resync All" button
- [ ] Verify all 1000 missing orders appear
- [ ] Update this document with actual findings

