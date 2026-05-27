# Shopify Sync Quick Reference

## Summary of Changes

### ✅ Issues Resolved
1. **Pagination**: Already implemented with 250 orders per request (Shopify API max)
2. **Missing Orders**: Using 1-hour buffer in incremental sync to catch missed orders
3. **API Limits**: Properly handled with rate limiting and retries
4. **Daily Automation**: New cron job endpoint created

### 📋 What Was Added

#### 1. Cron Job Endpoint
**File**: `/app/api/cron/shopify-sync/route.ts`
- Automatic daily sync triggered by Vercel
- Same logic as manual sync but optimized for cron
- Secured with CRON_SECRET bearer token
- Comprehensive logging with [CRON] prefix

#### 2. Configuration File
**File**: `vercel.json`
- Defines cron schedule: `0 1 * * *` (daily at 1 AM UTC)
- Can be customized to different times using cron syntax

#### 3. Documentation
**File**: `SHOPIFY_SYNC_SETUP.md`
- Complete setup instructions
- Shopify API limit details
- Troubleshooting guide
- Performance estimates

---

## Quick Start (3 Steps)

### Step 1: Add Environment Variable
In Vercel Dashboard → Settings → Environment Variables:
```
CRON_SECRET = (generate with: openssl rand -hex 32)
```

### Step 2: Commit Configuration
```bash
git add vercel.json SHOPIFY_SYNC_SETUP.md app/api/cron/shopify-sync/route.ts
git commit -m "Add automatic daily Shopify sync via cron job"
git push
```

### Step 3: Deploy
Vercel will automatically enable the cron job after deployment.

---

## Shopify API Limits (Summary)

| Limit | Value | Status |
|-------|-------|--------|
| Rate Limit | 2 requests/second | ✅ Handled (1.5-2s delay) |
| Orders per Request | 250 max | ✅ Using max |
| Pagination | Link header | ✅ Implemented |
| Retry Attempts | 5 | ✅ Configured |
| Retry Delay | Exponential backoff | ✅ Implemented |

---

## Two Sync Methods (Both Active)

### 1. Manual Sync (UI Button)
- **How**: Click "Sync Orders" button in Orders page
- **When**: Anytime you want updated data immediately
- **Endpoint**: `POST /api/shopify-orders`

### 2. Automatic Daily Sync (Cron Job)
- **How**: Automatically runs daily at 1 AM UTC
- **When**: Every 24 hours automatically
- **Endpoint**: `POST /api/cron/shopify-sync` (with Bearer token)
- **Customizable**: Edit `vercel.json` for different times

---

## Key Features

✅ **Pagination**: Handles unlimited orders (250 per page)
✅ **Incremental Sync**: Only fetches new/updated orders
✅ **Buffer Strategy**: 1-hour buffer catches missed orders
✅ **Batch Processing**: Saves in 100-order batches (efficient)
✅ **Rate Limiting**: Respects Shopify's 2 req/sec limit
✅ **Error Recovery**: 5 retries with exponential backoff
✅ **Inventory Processing**: Auto-deducts inventory for fulfilled orders
✅ **Logging**: Comprehensive logs for debugging

---

## Testing the Cron Job

### Test Endpoint (Bearer Auth Required)
```bash
# Get your CRON_SECRET from env vars, then:
curl -X POST http://localhost:3000/api/cron/shopify-sync \
  -H "Authorization: Bearer your-secret-here"
```

### Monitor Cron Runs
1. Go to Vercel Dashboard
2. Select your project
3. Go to Deployments → select latest
4. Check "Logs" for cron execution results

---

## Troubleshooting

**Q: How do I verify orders are being synced?**
A: Check the `shopify_orders` table in Supabase for new entries with today's date

**Q: Can I change the sync time?**
A: Yes! Edit `vercel.json` schedule: `"0 2 * * *"` = 2 AM UTC, `"0 */12 * * *"` = every 12 hours

**Q: What if I'm missing orders?**
A: Run manual sync immediately to check. Then verify `lastSync` timestamp in `shopify_stores` table.

**Q: Is the manual sync button still available?**
A: Yes! Both manual (button) and automatic (cron) work independently.

---

## File Changes Summary

```
NEW FILES:
├── app/api/cron/shopify-sync/route.ts    (Cron endpoint)
├── vercel.json                           (Cron configuration)
└── SHOPIFY_SYNC_SETUP.md                (Full documentation)

UNCHANGED FILES (Already working):
├── lib/shopify-api.ts                   (Has pagination)
├── app/api/shopify-orders/route.ts      (Manual sync)
└── components/shopify-orders-client.tsx (UI button)
```

---

## Next: Implementation Checklist

- [ ] Generate CRON_SECRET: `openssl rand -hex 32`
- [ ] Add CRON_SECRET to Vercel environment variables
- [ ] Commit changes: `git add .` → `git commit` → `git push`
- [ ] Wait for Vercel deployment to complete
- [ ] Monitor first cron run (tomorrow at 1 AM UTC)
- [ ] Verify orders synced daily by checking database
- [ ] Customize sync time if needed (edit `vercel.json`)
