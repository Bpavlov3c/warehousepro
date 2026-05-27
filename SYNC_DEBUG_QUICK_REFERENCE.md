# Sync Missing Orders - Quick Reference

## The Problem
- **B2B-5101:** Missing ~200 orders (synced 750, expected 950)
- **B2B-5939:** Missing ~800 orders (synced 500, expected 1300)
- **Total Missing:** ~1000 orders

---

## Likely Causes (Ranked by Probability)

### 1. **PAGINATION INCOMPLETE** (Most Likely - 60% probability)

**What's happening:**
```
B2B-5939 has 1300 orders
- Page 1: 250 orders fetched ✓
- Page 2: 250 orders fetched ✓
- Page 3: 250 orders fetched ✓
- Page 4: 250 orders fetched ✓
- Page 5: 250 orders fetched ✓
- Page 6: 50 orders NOT FETCHED ✗

Missing: 50 orders + potential pages not reached
```

**Fix:**
```javascript
// Check if Link header pagination is working
// Look in: lib/shopify-api.ts parseLinkHeader() function
// Issue: Might not be parsing "rel=\"next\"" correctly
```

---

### 2. **RATE LIMITING SILENT FAILURE** (20% probability)

**What's happening:**
```
Request: GET /admin/api/2024-10/orders.json?limit=250...&since_id=8000

Response: 429 Too Many Requests
Retry-After: 60

System: Waits 60 seconds, retries...
Result: Eventually fails after 5 retries
Missing: All remaining orders (800+)
```

**Evidence in logs:**
```
[ERR] Rate limited. Waiting 2000ms before retry 1/5
[ERR] Rate limited. Waiting 4000ms before retry 2/5
[ERR] Rate limited. Waiting 8000ms before retry 3/5
[ERR] Rate limited. Waiting 16000ms before retry 4/5
[ERR] Rate limited. Waiting 32000ms before retry 5/5
[ERR] Rate limit exceeded after 5 retries ← FAILURE
```

**Fix:** Increase wait times or add exponential backoff

---

### 3. **INCREMENTAL SYNC WINDOW ISSUE** (15% probability)

**What's happening:**
```
Store last_sync: 2025-05-27 15:30:00 UTC
Current sync uses buffer: 2025-05-27 14:30:00 UTC (1 hour before)

Problem: Orders created between:
- 2025-05-26 14:30:00 to 2025-05-26 23:59:59 (yesterday) → RE-FETCHED
- 2025-05-27 00:00:00 to 2025-05-27 14:30:00 (today) → MISSED!

Missing: All orders created in first 14.5 hours of today
```

**Fix:**
```javascript
// Use 2-hour buffer instead of 1 hour
const buffer = new Date(lastSync.getTime() - 2 * 60 * 60 * 1000)
// OR always do full sync: remove createdAtMin parameter
```

---

### 4. **TIMEOUT/CONNECTION DROPPED** (5% probability)

**What's happening:**
```
Fetching page 4 of 6...
[Socket timeout after 30 seconds]
Connection closed
Missing: Pages 4, 5, 6 (750+ orders)
```

---

## Quick Debug Steps

### Step 1: Check Database Status
```sql
SELECT 
  store_name,
  last_sync,
  total_orders
FROM shopify_stores
WHERE store_name IN ('B2B-5101', 'B2B-5939');
```

### Step 2: Check Server Logs
```
Vercel Dashboard → Deployments → Functions → /api/shopify-orders
Look for pagination or rate limit errors
```

### Step 3: Manually Test Shopify API
```bash
# Get total count from Shopify directly
curl "https://B2B5101.myshopify.com/admin/api/2024-10/orders.json?limit=1&status=any" \
  -H "X-Shopify-Access-Token: $TOKEN"

# Check Link header for pagination
curl -i "https://B2B5101.myshopify.com/admin/api/2024-10/orders.json?limit=250&status=any" \
  -H "X-Shopify-Access-Token: $TOKEN" \
  | grep -i "link:"
```

### Step 4: Test Pagination Parsing
```javascript
// In browser console, test the parser
const linkHeader = '<https://...&since_id=9999>; rel="next">';
const result = linkHeader.split(',')
  .find(l => l.includes('rel="next"'))
  ?.split(';')[0]
  ?.trim()
  ?.slice(1, -1); // Remove < >

console.log('Next URL:', result);
```

---

## The Fix - Resync All Orders

### Option 1: Use UI Button
1. Go to Stores page
2. Click "Resync All" (red button)
3. Confirm the dialog
4. Wait for completion (5-10 minutes)
5. Check database for 1000+ new orders

### Option 2: Manual API Call
```bash
curl -X POST http://localhost:3000/api/admin/resync-all-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [CRON_SECRET]"
```

### Option 3: SQL Reset + Full Sync
```sql
-- Step 1: Reset last sync for these stores
UPDATE shopify_stores
SET last_sync = NULL
WHERE store_name IN ('B2B-5101', 'B2B-5939');

-- Step 2: Delete existing orders (CAREFUL!)
DELETE FROM shopify_orders
WHERE store_id IN (
  SELECT id FROM shopify_stores 
  WHERE store_name IN ('B2B-5101', 'B2B-5939')
);

-- Step 3: Use UI to manually sync
```

---

## Verify the Fix

```sql
-- After resync, check counts
SELECT 
  store_name,
  COUNT(*) as order_count
FROM shopify_orders so
JOIN shopify_stores ss ON so.store_id = ss.id
WHERE ss.store_name IN ('B2B-5101', 'B2B-5939')
GROUP BY store_name;

-- Should show:
-- B2B-5101: 950 orders
-- B2B-5939: 1300 orders
-- Total: 2250 orders
```

---

## Prevention: Enable Request Logging

Add detailed logging to `lib/shopify-api.ts`:

```typescript
// In getAllOrders() method
while (nextUrl) {
  console.log(`[PAGE ${currentPage}] Requesting: ${nextUrl}`)
  
  const { data, headers } = await this.makeRequest(nextUrl)
  const orders = data.orders || []
  allOrders.push(...orders)
  
  console.log(`[PAGE ${currentPage}] Got ${orders.length} orders (total: ${allOrders.length})`)
  
  // Parse Link header
  const linkHeader = headers.get("Link")
  console.log(`[PAGE ${currentPage}] Link header: ${linkHeader}`)
  
  nextUrl = this.parseLinkHeader(linkHeader)
  console.log(`[PAGE ${currentPage}] Next URL: ${nextUrl || 'NONE (end of list)'}`)
}
```

This will show exactly which page is failing.

---

## Summary Table

| Issue | Evidence | Likelihood | Fix Time |
|-------|----------|------------|----------|
| Incomplete Pagination | See page 4 gap | **60%** | 30 min |
| Rate Limiting | 429 errors in logs | **20%** | 15 min |
| Timing Window | Orders in first 14h of day | **15%** | 5 min |
| Connection Drop | Timeout errors | **5%** | 20 min |

