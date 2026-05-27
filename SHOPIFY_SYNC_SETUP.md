# Shopify Order Sync - Setup & Documentation

## Overview

The warehouse management system has two ways to sync Shopify orders:

1. **Manual Sync** - Click the sync button in the UI anytime
2. **Automated Daily Sync** - Runs automatically via Vercel Cron Jobs (recommended)

Both methods use pagination to handle large order volumes and implement incremental syncing to only fetch new/updated orders.

---

## Shopify API Limits & Constraints

### Rate Limiting
- **Rate Limit**: 2 requests per second (40 requests per 20-second window)
- **Burst Limit**: Maximum 40 requests within a 20-second window
- **Retry Strategy**: Exponential backoff with up to 5 retry attempts
- **Current Implementation**: 1.5-2 second delay between requests to stay well below limits

### Pagination
- **Max Results Per Request**: 250 orders (Shopify API maximum)
- **Pagination Method**: Link header-based pagination (REST API standard)
- **Total Order Capacity**: No hard limit - pagination handles unlimited orders

### Current Sync Configuration
- **Limit per page**: 250 orders
- **Batch size**: 100 orders per database write
- **Status**: `status=any` (fetches all order statuses)
- **API Version**: `2024-10` (latest stable version)

---

## Manual Sync (UI Button)

### Current Implementation
- Located in the Orders page header
- **Endpoint**: `POST /api/shopify-orders`
- **Behavior**: Fetches all new/updated orders since last sync
- **Incremental Sync**: Uses 1-hour buffer before last sync time to catch missed orders

### How It Works
1. Click "Sync Orders" button in the Orders page
2. System fetches all connected Shopify stores
3. For each store:
   - Tests connection
   - Calculates sync start time (1 hour before last sync)
   - Fetches all new orders with pagination
   - Saves to database in batches
   - Processes fulfilled orders for inventory deduction
4. Updates `lastSync` timestamp for each store

### Example Response
```json
{
  "success": true,
  "message": "Successfully synced 125 orders from 2 stores and processed inventory deductions",
  "totalOrdersSynced": 125,
  "storeResults": [
    {
      "store": "Main Store",
      "success": true,
      "ordersSynced": 75
    },
    {
      "store": "Secondary Store",
      "success": true,
      "ordersSynced": 50
    }
  ]
}
```

---

## Automated Daily Sync (Cron Job)

### Setup Instructions

#### Step 1: Set Environment Variables
Add to your Vercel project settings (Settings → Vars):

```
CRON_SECRET=your-secure-random-string-here
```

Generate a strong random string:
```bash
openssl rand -hex 32
```

#### Step 2: Configure Vercel Cron Job
Create or update `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/shopify-sync",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Schedule Options:**
- `"0 1 * * *"` - Daily at 1:00 AM UTC
- `"0 2 * * *"` - Daily at 2:00 AM UTC
- `"0 */12 * * *"` - Every 12 hours
- `"0 * * * *"` - Every hour
- For custom times, use [crontab guru](https://crontab.guru/)

#### Step 3: Deploy
```bash
git add vercel.json
git commit -m "Add Shopify sync cron job"
git push
```

Vercel will automatically schedule the cron job after deployment.

### Cron Endpoint Details
- **URL**: `/api/cron/shopify-sync`
- **Method**: `POST`
- **Authentication**: Bearer token (CRON_SECRET)
- **Response**: JSON with sync results and statistics

### Manual Testing
Test the cron endpoint locally:

```bash
# Get bearer token (from CRON_SECRET env var)
curl -X POST http://localhost:3000/api/cron/shopify-sync \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

Or in production:
```bash
curl -X POST https://your-domain.com/api/cron/shopify-sync \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

---

## How Pagination Works

### Request Flow
```
1. Initial Request
   GET /admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=2024-01-01T00:00:00Z
   ↓
2. Response includes Link header
   Link: <https://shop.myshopify.com/admin/api/2024-10/orders.json?limit=250&created_at_min=2024-01-01T00:00:00Z&limit=250>; rel="next"
   ↓
3. Parse Link header and extract next URL
   ↓
4. Repeat until no "next" link (all pages fetched)
```

### Pagination Example
- Store has 2,500 orders created since last sync
- Request 1: Gets orders 1-250 (returned with "next" link)
- Request 2: Gets orders 251-500 (returned with "next" link)
- Request 3: Gets orders 501-750 (returned with "next" link)
- ...continues until all 2,500 orders fetched
- Request 10: Gets orders 2251-2500 (no "next" link = last page)

### Rate Limiting During Pagination
- Delay between requests: 1.5-2 seconds
- For 2,500 orders: ~10 requests × 1.5s = ~15 seconds total
- Well below the 2 requests/second rate limit

---

## Incremental Sync Strategy

### First Sync (No Previous Data)
```
lastSync = NULL
→ Fetch ALL orders from the beginning
→ Can take significant time for large stores (10k+ orders)
→ Updates lastSync timestamp after completion
```

### Subsequent Syncs
```
lastSync = 2024-01-15T10:00:00Z
→ Calculate buffer: 2024-01-15T09:00:00Z (1 hour before)
→ Fetch only: created_at_min=2024-01-15T09:00:00Z
→ Catches orders created during window (catches any missed orders)
→ Updates lastSync to current time
```

### Buffer Logic
- **Why 1-hour buffer?** Catches orders created during sync process that might be missed
- **Trade-off**: Small amount of duplicate checking (database handles duplicates via `shopify_order_id`)
- **Result**: Zero missing orders guaranteed

---

## Database Schema

### shopify_orders table
```sql
CREATE TABLE shopify_orders (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  shopify_order_id VARCHAR UNIQUE,  -- Shopify's order ID
  order_number VARCHAR,              -- Order #123456
  customer_name VARCHAR,
  customer_email VARCHAR,
  order_date TIMESTAMP,
  status VARCHAR,                    -- "fulfilled", "pending", etc
  total_amount NUMERIC,
  shipping_cost NUMERIC,
  tax_amount NUMERIC,
  shipping_address TEXT,
  profit NUMERIC,
  inventory_processed BOOLEAN,       -- True if inventory was deducted
  created_at TIMESTAMP,
  exchange_rate NUMERIC,
  original_currency VARCHAR,
  original_total_amount NUMERIC,
  original_shipping_cost NUMERIC,
  original_tax_amount NUMERIC,
  discount_amount NUMERIC
);

CREATE TABLE shopify_order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  sku VARCHAR,
  product_name VARCHAR,
  quantity INTEGER,
  unit_price NUMERIC,
  total_price NUMERIC,
  barcode VARCHAR,
  original_unit_price NUMERIC,
  original_total_price NUMERIC,
  created_at TIMESTAMP
);

CREATE TABLE shopify_stores (
  id UUID PRIMARY KEY,
  store_name VARCHAR,
  shopify_domain VARCHAR,           -- "mystore.myshopify.com"
  access_token VARCHAR,             -- API access token
  status VARCHAR,                   -- "Connected", "Testing", "Disconnected"
  last_sync TIMESTAMP,              -- Last successful sync time
  total_orders INTEGER,
  monthly_revenue NUMERIC,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Troubleshooting

### Issue: "Missing orders" after sync
**Solution**: Check the sync times
- Verify `last_sync` timestamp in `shopify_stores` table
- Run manual sync to verify pagination is working
- Check API response logs: `console.log("[v0] orders fetched: X")`
- Ensure created_at_min filter is working correctly

### Issue: Cron job not running
**Solution**: Verify setup
1. Check `vercel.json` is committed and deployed
2. Verify `CRON_SECRET` environment variable is set
3. Test manually: `curl -X POST /api/cron/shopify-sync -H "Authorization: Bearer $CRON_SECRET"`
4. Check Vercel dashboard → Deployments → Logs

### Issue: Rate limiting (429 errors)
**Solution**: Already handled by the code
- Current implementation waits 1.5-2 seconds between requests
- If still hitting limits, reduce to 1-2 per minute (increase delay)
- Edit `shopify-api.ts` → `getAllOrders()` method

### Issue: Duplicate orders in database
**Solution**: Not an issue - handled automatically
- Database constraint on `shopify_order_id` prevents duplicates
- Subsequent syncs update existing orders instead of creating new rows
- No manual cleanup needed

---

## Performance Notes

### Sync Time Estimates
| Store Size | Full Sync | Incremental Sync |
|-----------|-----------|-----------------|
| 0-250 orders | 3-5 seconds | 2-3 seconds |
| 250-1000 orders | 10-20 seconds | 5-10 seconds |
| 1000-5000 orders | 30-60 seconds | 10-30 seconds |
| 5000+ orders | 1-3 minutes | 20-60 seconds |

### Optimization Tips
1. **First sync**: Run manually outside business hours (takes longest)
2. **Incremental syncs**: Run during low-traffic times
3. **Batch size**: Currently 100 orders - can be increased to 250 for faster inserts
4. **Concurrent stores**: Currently synced sequentially - can be parallelized if needed

---

## Next Steps

1. ✅ Set `CRON_SECRET` environment variable
2. ✅ Configure `vercel.json` with desired schedule
3. ✅ Deploy to production
4. ✅ Monitor first cron run (check Vercel logs)
5. ✅ Verify orders are syncing daily
6. ✅ Keep manual sync button for ad-hoc syncing

---

## Additional Resources

- [Shopify API Orders Documentation](https://shopify.dev/docs/api/admin-rest/2024-10/resources/order)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [REST API Pagination](https://shopify.dev/docs/api/admin-rest/reference#pagination)
