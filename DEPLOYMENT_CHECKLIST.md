# Shopify Sync Implementation Checklist

## Current Status: ✅ READY TO DEPLOY

All code has been implemented and tested. This checklist guides the deployment process.

---

## Pre-Deployment Checklist

### Understanding (Read First)
- [ ] Read `SHOPIFY_SYNC_QUICK_REFERENCE.md` (2 min)
- [ ] Review `SETUP_GUIDE_VISUAL.md` (3 min)
- [ ] Understand pagination in `SHOPIFY_SYNC_SETUP.md` (5 min)

### Files Review
- [ ] Verify `app/api/cron/shopify-sync/route.ts` exists (198 lines)
- [ ] Verify `vercel.json` has cron schedule configured
- [ ] Confirm documentation files are created (4 files total)

---

## Deployment Phase (3 Steps)

### Step 1: Generate Security Token (30 seconds)
```bash
# Run in terminal:
openssl rand -hex 32

# Copy the output (example):
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Actions**:
- [ ] Generate CRON_SECRET using command above
- [ ] Copy output to clipboard
- [ ] Do NOT commit this to git

### Step 2: Configure Vercel (2 minutes)
1. **Open Vercel Dashboard**
   - [ ] Go to https://vercel.com/dashboard
   - [ ] Select "WarehousePro" project

2. **Add Environment Variable**
   - [ ] Click Settings (top menu)
   - [ ] Go to Environment Variables (left sidebar)
   - [ ] Click "Add New..."
   - [ ] Name: `CRON_SECRET`
   - [ ] Value: `(paste from Step 1)`
   - [ ] Click "Save"
   - [ ] Confirm variable appears in list

3. **Verify Setup**
   - [ ] CRON_SECRET is visible in environment variables
   - [ ] No errors displayed

### Step 3: Deploy Configuration (1-2 minutes)
```bash
# Ensure you're in project directory
cd /path/to/warehousepro

# Stage changes
git add vercel.json
git add app/api/cron/shopify-sync/route.ts
git add SHOPIFY_SYNC_SETUP.md
git add SHOPIFY_SYNC_QUICK_REFERENCE.md
git add IMPLEMENTATION_SUMMARY.md
git add SETUP_GUIDE_VISUAL.md

# Commit
git commit -m "Setup: Add daily Shopify sync via Vercel cron job

- New cron endpoint at /api/cron/shopify-sync
- Runs automatically daily at 1 AM UTC (configurable)
- Bearer token authentication with CRON_SECRET
- Full pagination support for unlimited orders
- Preserves manual sync button in UI
- Documentation included"

# Push to deploy
git push origin main
```

**Actions**:
- [ ] All files staged with `git add`
- [ ] Commit message is clear and descriptive
- [ ] Push successful (no errors)
- [ ] Wait for GitHub to show "Vercel deployed" comment

---

## Post-Deployment Verification (3-5 minutes)

### Immediate Checks (Right After Deployment)
1. **Verify Deployment**
   - [ ] Go to Vercel Dashboard
   - [ ] Select project → Deployments
   - [ ] Latest deployment shows "Ready" (green)
   - [ ] No error badges displayed

2. **Check Cron Configuration**
   - [ ] Deployment page shows cron job listed
   - [ ] Status shows active/enabled
   - [ ] Schedule shows "0 1 * * *" (1 AM UTC daily)

3. **Test Manual Sync (Optional)**
   - [ ] Go to application URL
   - [ ] Navigate to Orders page
   - [ ] Click "Sync Orders" button
   - [ ] Sync completes successfully
   - [ ] Orders data updates in UI

### Monitor First Cron Run
1. **Schedule to Check** (Tomorrow, 1 AM UTC)
   - [ ] Set calendar reminder for 1 AM UTC tomorrow
   - [ ] OR set alarm 30 minutes before (12:30 AM UTC)

2. **Check Logs When Ready**
   - [ ] Go to Vercel Dashboard
   - [ ] Select project → Deployments → Latest
   - [ ] Go to "Logs" tab
   - [ ] Filter by "cron" or "shopify"
   - [ ] Look for success messages with order counts

3. **Verify Database Updates**
   - [ ] Go to Supabase dashboard
   - [ ] Select project → Table Editor
   - [ ] Open `shopify_stores` table
   - [ ] Check `last_sync` timestamp is recent (1 AM UTC)
   - [ ] Verify `total_orders` count is reasonable

4. **Expected Log Output**
   ```
   [CRON] Starting daily Shopify orders sync at 2024-02-02T01:00:00Z
   [CRON] Found 2 connected store(s) to sync
   [CRON] Syncing orders for store: Main Store
   [CRON] Fetching page 1...
   [CRON] Fetched 250 orders (total: 250)
   [CRON] Processing fulfilled orders for inventory deduction...
   [CRON] Completed sync for Main Store: 250 orders saved
   [CRON] Daily sync completed. Total orders synced: 250
   ```

---

## Customization (Optional)

### Change Sync Time
**Edit `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/shopify-sync",
      "schedule": "0 2 * * *"     // Change this (2 AM UTC instead of 1 AM)
    }
  ]
}
```

**Common Schedules**:
- `"0 0 * * *"` → 12 AM UTC (midnight)
- `"0 2 * * *"` → 2 AM UTC
- `"0 6 * * *"` → 6 AM UTC
- `"0 * * * *"` → Every hour
- `"0 */6 * * *"` → Every 6 hours

**Deploy changes**:
```bash
git add vercel.json
git commit -m "Adjust Shopify sync time to 2 AM UTC"
git push origin main
```

**Actions** (if customizing):
- [ ] Decide new schedule time
- [ ] Update `vercel.json`
- [ ] Commit and push
- [ ] New schedule active after deployment

---

## Testing & Troubleshooting

### Test 1: Verify Cron Endpoint Exists
```bash
# Should return 401 (Unauthorized) without token - this is correct!
curl -X POST https://your-domain.com/api/cron/shopify-sync

# Response:
# {"success":false,"message":"Unauthorized - Invalid or missing CRON_SECRET"}
```

**Actions**:
- [ ] Run curl command above
- [ ] Verify response shows 401
- [ ] 401 is expected and correct (means endpoint is protected)

### Test 2: Verify With Valid Token
```bash
# Replace YOUR_CRON_SECRET with actual value
curl -X POST https://your-domain.com/api/cron/shopify-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Expected response:
# {"success":true,"message":"Cron sync completed..."}
```

**Actions**:
- [ ] Get CRON_SECRET from environment variables
- [ ] Run curl command above
- [ ] Verify response shows `"success":true`

### Test 3: Check Database for Updates
```sql
-- In Supabase, run this SQL query
SELECT 
  store_name,
  last_sync,
  total_orders,
  updated_at
FROM shopify_stores
ORDER BY updated_at DESC
LIMIT 1;

-- Should show last_sync updated very recently
```

**Actions**:
- [ ] Open Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Run query above
- [ ] Verify `last_sync` is within last hour

---

## Troubleshooting Guide

### Issue: Cron job not running
**Symptoms**: `last_sync` timestamp not updated, no logs visible

**Diagnosis**:
- [ ] Check Vercel dashboard shows deployment as "Ready"
- [ ] Verify `CRON_SECRET` is set in environment variables
- [ ] Confirm `vercel.json` exists and has correct format
- [ ] Check that cron path is `/api/cron/shopify-sync` (exact spelling)

**Solution**:
1. Redeploy: `git commit --allow-empty -m "Retry cron deployment"` && `git push`
2. Wait 5 minutes for Vercel to re-enable cron
3. Check logs again in 24 hours

### Issue: Sync fails with "Connection failed"
**Symptoms**: Log shows `"Connection failed"` for a store

**Diagnosis**:
- [ ] Verify Shopify store credentials are still valid
- [ ] Check `access_token` hasn't expired
- [ ] Test store connection manually with sync button

**Solution**:
1. Go to Shopify store settings
2. Regenerate API access token if needed
3. Update store credentials in database
4. Run manual sync to verify connection works

### Issue: Missing orders after sync
**Symptoms**: Expected orders not in database

**Diagnosis**:
- [ ] Check `last_sync` timestamp (when was last sync?)
- [ ] Verify order `created_at` is after sync start time
- [ ] Check if orders are in a different store account

**Solution**:
1. Run manual sync immediately with button
2. Check Vercel logs for error messages
3. Verify store connection works
4. Check Shopify store has expected orders

### Issue: Rate limiting errors in logs
**Symptoms**: `"429 Rate Limited"` errors in logs

**Diagnosis**:
- Current delay is 1.5-2 seconds between requests
- This is below Shopify's 2 req/sec limit
- Rate limiting only happens if delay is too short

**Solution**:
- No action needed - system handles retries
- If persistent, can increase delay in `shopify-api.ts`

---

## Rollback Plan (If Issues)

### Quick Disable (Keep Code)
```bash
# Comment out cron job in vercel.json
{
  "crons": []  // Empty array disables cron
}

# Deploy to disable
git add vercel.json
git commit -m "Disable cron job temporarily"
git push
```

### Full Revert (Remove All Changes)
```bash
# Revert to previous commit (before adding cron)
git revert HEAD~4  # Adjust number based on commits

# Or reset to last known good
git reset --hard origin/main~1
git push --force-with-lease
```

**Actions** (if needed):
- [ ] Decide whether to disable (keep code) or revert (remove code)
- [ ] Execute appropriate command
- [ ] Verify manual sync still works
- [ ] Re-enable once issue is resolved

---

## Success Criteria

### Deployment is Successful When:
- ✅ Vercel dashboard shows "Ready" status
- ✅ No errors in deployment logs
- ✅ `CRON_SECRET` environment variable is set
- ✅ `vercel.json` is deployed with correct path and schedule
- ✅ Manual sync button still works in UI
- ✅ First cron run completes at scheduled time (1 AM UTC)
- ✅ Logs show successful sync with order counts
- ✅ Database `shopify_stores.last_sync` timestamp updates
- ✅ Orders are added/updated in `shopify_orders` table

### Ready for Production When:
- ✅ All above criteria met
- ✅ Multiple cron runs successful (at least 2-3 days)
- ✅ Manual sync tested and works
- ✅ No issues in logs or error reporting
- ✅ Team is trained on how system works

---

## Documentation Review

### For Team Members
- [ ] Share `SHOPIFY_SYNC_QUICK_REFERENCE.md` with team
- [ ] Hold 15-min team meeting to explain new cron system
- [ ] Demonstrate where to check sync status
- [ ] Explain how to use manual sync button

### For Ops/DevOps
- [ ] Complete this checklist
- [ ] Save `SHOPIFY_SYNC_SETUP.md` for reference
- [ ] Monitor first week of automatic syncs
- [ ] Adjust schedule if needed
- [ ] Document any customizations made

### For Developers
- [ ] Review cron endpoint code in `app/api/cron/shopify-sync/route.ts`
- [ ] Understand pagination implementation in `lib/shopify-api.ts`
- [ ] Know where to add logging or metrics
- [ ] Understand incremental sync strategy

---

## Sign-Off

**Deployment Completed By**: _________________ **Date**: _______

**Verified By**: _________________ **Date**: _______

**Notes**: 
```
[Space for any notes or issues encountered during setup]




```

---

## Additional Resources

- **Setup Documentation**: `SHOPIFY_SYNC_SETUP.md`
- **Quick Reference**: `SHOPIFY_SYNC_QUICK_REFERENCE.md`
- **Visual Guide**: `SETUP_GUIDE_VISUAL.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **This Checklist**: `DEPLOYMENT_CHECKLIST.md`

**Total Setup Time**: ~5 minutes
**Total Deployment Time**: ~5 minutes
**First Cron Run**: Tomorrow at 1 AM UTC

---

**Ready to deploy? Start with Step 1 above! 🚀**
