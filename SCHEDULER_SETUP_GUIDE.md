## Scheduler Settings - Store Setup Integration

### Overview
The scheduler settings are now integrated directly into your store management interface. You can enable/disable automatic daily syncing and customize the sync time for each store independently.

### Features

✅ **Enable/Disable Daily Sync** - Toggle automatic syncing per store
✅ **Customize Sync Time** - Choose any hour (0-23 UTC) for daily syncing  
✅ **Visual Status Indicator** - See sync status in the stores table
✅ **Next Scheduled Run Prediction** - View when the next sync will run
✅ **Manual Sync Always Available** - Keep the manual sync button alongside auto-sync
✅ **Backward Compatible** - Existing stores default to sync disabled

### How to Use

#### Enable Automatic Sync for a Store

1. **Add a New Store:**
   - Click "Add Store"
   - Fill in store details (name, domain, token, etc.)
   - Scroll to "Sync Schedule" section
   - Toggle "Enable Daily Sync" ON
   - Select sync time from dropdown (0-23 UTC)
   - Click "Add Store"

2. **Edit Existing Store:**
   - Click the ✏️ icon on a store row
   - Scroll to "Sync Schedule" section
   - Toggle "Enable Daily Sync" ON/OFF
   - Select desired sync hour
   - View next scheduled sync time
   - Click "Update Store"

3. **Disable Sync:**
   - Edit the store
   - Toggle "Enable Daily Sync" OFF
   - Click "Update Store"
   - Sync will no longer run automatically (manual sync still works)

### Schedule Display in Table

Each store row now shows a "Sync Schedule" column:

- **If Sync Enabled:**
  - Badge showing "Auto"
  - Sync time in HH:00 UTC format
  - Example: `Auto` `01:00 UTC`

- **If Sync Disabled:**
  - Shows `-` (dash)

### Database Schema

Four new columns added to `shopify_stores` table:

```
sync_enabled (boolean)           - Enable/disable auto sync for this store
sync_schedule_hour (integer)     - Hour (0-23) in UTC for daily sync
last_scheduled_sync (timestamp)  - When the scheduled sync last ran
next_scheduled_sync (timestamp)  - Predicted time of next sync
```

### Cron Job Behavior

The `/api/cron/shopify-sync` endpoint now:

1. **Filters stores** - Only syncs stores with `sync_enabled = true`
2. **Skips disabled stores** - Logs count of disabled stores
3. **Updates timestamps:**
   - `last_scheduled_sync` - Set when scheduled sync runs
   - `next_scheduled_sync` - Calculated for next day at configured hour
4. **Maintains manual sync** - Manual endpoint (`POST /api/shopify-orders`) works independently

### API Integration

#### Type Updates
```typescript
export interface ShopifyStore {
  // ... existing fields
  syncEnabled?: boolean          // Is automatic sync enabled?
  syncScheduleHour?: number      // Hour (0-23 UTC) for sync
  lastScheduledSync?: string     // When scheduled sync last ran
  nextScheduledSync?: string     // Next predicted sync time
}
```

#### New Database Method
```typescript
async function updateStoreScheduler(
  storeId: string,
  syncEnabled: boolean,
  syncScheduleHour: number
): Promise<ShopifyStore>
```

### Configuration

#### Manual Setup (if not using UI)

```typescript
import { supabaseStore } from "@/lib/supabase-store"

// Enable sync for a store at 3 AM UTC
await supabaseStore.updateStoreScheduler("store-id", true, 3)

// Disable sync
await supabaseStore.updateStoreScheduler("store-id", false, 1)
```

#### Vercel Cron Configuration

Already configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/shopify-sync",
    "schedule": "0 1 * * *"
  }]
}
```

To change the global cron schedule, edit `vercel.json` and deploy.

### Migration Notes

- **Existing stores:** Default to `sync_enabled = false` (no change in behavior)
- **Backward compatible:** Existing manual sync continues to work
- **No data loss:** All existing order sync data is preserved
- **Safe to deploy:** Can be rolled back without issues

### Best Practices

1. **Choose Off-Peak Hours** - Select times when your store has low traffic (e.g., 2-4 AM UTC)
2. **Stagger Multiple Stores** - If you have many stores, space them out (1 AM, 2 AM, 3 AM, etc.)
3. **Monitor First Run** - Check logs after first automated sync to ensure success
4. **Keep Manual Sync Ready** - For urgent syncs outside the schedule, use manual sync button
5. **Use UTC for Consistency** - All times are in UTC regardless of your local timezone

### Troubleshooting

**Sync not running?**
- Check if `sync_enabled` is true
- Verify store status is "Connected" or "Testing"
- Check CRON_SECRET is set in Vercel environment variables
- Review cron execution logs in Vercel dashboard

**Wrong sync time showing?**
- Ensure you selected correct hour (0-23 UTC)
- Time is displayed with leading zeros (e.g., "01:00 UTC")
- Next sync time is calculated based on current time and selected hour

**Want to temporarily disable?**
- Toggle off in store edit dialog
- No need to delete the store
- Can re-enable anytime with same settings

### Files Modified

- `scripts/add-scheduler-columns.sql` - Database migration
- `lib/supabase-store.ts` - Type definitions and data layer
- `app/stores/page.tsx` - UI for scheduler settings
- `app/api/cron/shopify-sync/route.ts` - Cron job filtering and updates

### Next Steps

1. Run database migration (SQL file)
2. Deploy changes
3. Test by adding/editing a store with sync enabled
4. Monitor first cron run tomorrow at configured time
5. Adjust hours per store as needed
