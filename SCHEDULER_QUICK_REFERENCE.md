## Scheduler Settings - Quick Reference Card

### Deploy Checklist

**Step 1: Database Migration**
```bash
# Run this SQL in Supabase SQL Editor:
# File: scripts/add-scheduler-columns.sql
```

**Step 2: Push Code**
```bash
git add .
git commit -m "Add scheduler settings to store setup"
git push origin main
```

**Step 3: Test**
1. Add new store with sync enabled
2. Edit store to change sync hour
3. Disable sync on a store
4. View sync schedule in table

---

### User Quick Start

**To Enable Auto-Sync:**
1. Click ✏️ on a store (or ➕ when adding)
2. Scroll to "Sync Schedule" section
3. Toggle "Enable Daily Sync" ✓
4. Select hour from dropdown (e.g., 01:00 UTC)
5. Click "Update Store" or "Add Store"

**To Disable Auto-Sync:**
1. Click ✏️ on store
2. Toggle "Enable Daily Sync" ✗
3. Click "Update Store"

**To Change Sync Time:**
1. Click ✏️ on store
2. Select different hour from dropdown
3. Click "Update Store"

---

### What Changed

| Item | Before | After |
|------|--------|-------|
| Sync | Manual only | Manual + Auto |
| Store Setup | No scheduler | Scheduler section added |
| Table | No sync info | Sync schedule column |
| Cron | Syncs all stores | Syncs enabled stores only |

---

### Database

**New Columns on `shopify_stores`:**
```
sync_enabled          | boolean   | Enable/disable
sync_schedule_hour    | integer   | Hour 0-23 UTC
last_scheduled_sync   | timestamp | Last cron run
next_scheduled_sync   | timestamp | Next predicted run
```

---

### UI Components

**Add Store Dialog - New Section:**
```
Sync Schedule
┌─────────────────────────────┐
│ ☐ Enable Daily Sync        │
│ (checkbox toggles below)    │
│ Sync Time (UTC): [01:00] ▼  │
│ Daily sync will run at      │
│ 01:00 UTC                   │
└─────────────────────────────┘
```

**Stores Table - New Column:**
```
Sync Schedule
─────────────
Auto 01:00    (if enabled)
-             (if disabled)
```

---

### Configuration

**Default Values:**
- Sync Enabled: `false`
- Sync Hour: `1` (1 AM UTC)

**Valid Hours:** 0-23 (UTC)
**Cron Run Time:** Daily at configured hour

---

### Files Modified

```
✅ scripts/add-scheduler-columns.sql
✅ lib/supabase-store.ts
✅ app/stores/page.tsx
✅ app/api/cron/shopify-sync/route.ts
✅ Documentation files (3)
```

---

### Important Notes

✓ Manual sync still works (unaffected)
✓ Existing stores default to sync disabled
✓ No breaking changes
✓ Backward compatible
✓ Safe to rollback

---

### Troubleshooting

**Sync not showing?**
→ Run database migration first

**Settings not saving?**
→ Check browser console for errors

**Sync not running at expected time?**
→ Verify sync_enabled = true
→ Check store status = "Connected"
→ Verify CRON_SECRET in Vercel env vars

**Wrong time displaying?**
→ Hours are UTC (0-23)
→ Times shown with leading zeros (01:00)

---

### Example Setup

**Store 1: Main US Store**
- Sync enabled ✓
- Time: 02:00 UTC (9 PM EST)

**Store 2: EU Store**
- Sync enabled ✓
- Time: 03:00 UTC (3 AM CET)

**Store 3: Test Store**
- Sync disabled -
- Time: (N/A)

---

### Code Examples

**Enable scheduler:**
```typescript
import { supabaseStore } from "@/lib/supabase-store"

// Enable sync at 3 AM UTC
await supabaseStore.updateStoreScheduler(storeId, true, 3)
```

**Disable scheduler:**
```typescript
// Disable sync
await supabaseStore.updateStoreScheduler(storeId, false, 1)
```

---

### Next Steps

1. ✅ Review SCHEDULER_SETUP_GUIDE.md
2. ✅ Review SCHEDULER_IMPLEMENTATION.md
3. Run database migration SQL
4. Deploy code
5. Test scheduler in UI
6. Monitor first cron run

---

**Questions?** Check the full setup guide or implementation docs.
