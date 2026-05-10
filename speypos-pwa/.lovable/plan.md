

## Cloud Sync Implementation Plan

### Overview

Add Cloud Sync configuration to the Settings page and a manual "Sync Orders" action in Order History. The backend already handles the sync logic -- this is purely frontend work.

---

### What Gets Built

1. **Settings UI** -- A new "Cloud Sync" card in the Settings page with:
   - Enable/disable toggle
   - API Key input (masked)
   - Base URL input
   - Save button (persists to `cloud.sync` setting key using the versioned JSON pattern)
   - Reboot banner after save (same pattern as Telegram settings)

2. **Manual Sync Trigger** -- A "Sync Orders" button in Order History, visible per-shift, allowing admins to manually push orders for a selected shift to the cloud.

---

### Technical Details

#### 1. Types (`src/types/pos.ts`)

Add a new versioned settings interface:

```typescript
export interface CloudSyncSettingV1 {
  version: 1;
  enabled: boolean;
  api_key: string;
  base_url: string;
}
```

#### 2. API Layer (`src/lib/api.ts`)

Add a sync API:

```typescript
export const syncApi = {
  syncOrders: (shiftId: string) =>
    adminRequest<any>('/sync/orders', {
      method: 'POST',
      body: JSON.stringify({ shift_id: shiftId }),
    }),
};
```

#### 3. Settings Page (`src/components/admin/SettingsManagement.tsx`)

Add a new Card (above Telegram) with:
- **Icon**: Cloud icon from lucide-react
- **State**: `cloudSync` object with `enabled`, `api_key`, `base_url`
- **Load**: Read from `cloud.sync` setting key on mount (same pattern as receipt/telegram)
- **Save**: Upsert to `cloud.sync` with versioned payload (`{ version: 1, enabled, api_key, base_url }`)
- **UI controls**:
  - Switch for enabled/disabled
  - Input for Base URL (shown when enabled)
  - Input for API Key with `type="password"` (shown when enabled)
- **Validation**: When enabled, both `api_key` and `base_url` are required
- **Reboot banner**: Show after saving changes (same pattern as Telegram)

#### 4. Order History - Manual Sync (`src/components/admin/OrderHistoryManagement.tsx`)

- Add a "Sync Orders" button next to the shift selection area
- Only visible when a shift is selected and cloud sync is enabled (read from SettingsContext)
- On click: call `syncApi.syncOrders(selectedShiftId)` and show a toast on success/failure
- Button shows a loading spinner while syncing

#### 5. Settings Context (`src/contexts/SettingsContext.tsx`)

Add a helper to check if cloud sync is enabled:

```typescript
getCloudSyncEnabled: () => boolean
```

This reads from the settings map (`cloud.sync` key) and returns `true` only if `version === 1` and `enabled === true`.

#### 6. Translations (`src/lib/i18n.ts`)

New keys for both `en` and `km`:

| Key | English | Khmer |
|-----|---------|-------|
| `admin.settings.cloudSync` | Cloud Sync | ធ្វើសមកាលកម្មពពក |
| `admin.settings.cloudSyncDesc` | Sync order data to the cloud | ធ្វើសមកាលកម្មទិន្នន័យការកម្មង់ទៅពពក |
| `admin.settings.cloudSyncEnabled` | Enable Cloud Sync | បើកការធ្វើសមកាលកម្មពពក |
| `admin.settings.cloudSyncApiKey` | API Key | សោ API |
| `admin.settings.cloudSyncBaseUrl` | Base URL | URL មូលដ្ឋាន |
| `admin.settings.cloudSyncUpdated` | Cloud sync settings updated | ការកំណត់ធ្វើសមកាលកម្មពពកបានធ្វើបច្ចុប្បន្នភាព |
| `admin.settings.cloudSyncApiKeyRequired` | API Key is required when enabled | សោ API ត្រូវបានទាមទារនៅពេលបើក |
| `admin.settings.cloudSyncBaseUrlRequired` | Base URL is required when enabled | URL មូលដ្ឋានត្រូវបានទាមទារនៅពេលបើក |
| `admin.orderHistory.syncOrders` | Sync Orders | ធ្វើសមកាលកម្មការកម្មង់ |
| `admin.orderHistory.syncSuccess` | Orders synced successfully | បានធ្វើសមកាលកម្មការកម្មង់ដោយជោគជ័យ |
| `admin.orderHistory.syncFailed` | Failed to sync orders | ការធ្វើសមកាលកម្មការកម្មង់បានបរាជ័យ |
| `admin.orderHistory.syncing` | Syncing... | កំពុងធ្វើសមកាលកម្ម... |

---

### Files Modified

| File | Change |
|------|--------|
| `src/types/pos.ts` | Add `CloudSyncSettingV1` interface |
| `src/lib/api.ts` | Add `syncApi` with `syncOrders()` method |
| `src/lib/i18n.ts` | Add cloud sync translation keys (en + km) |
| `src/contexts/SettingsContext.tsx` | Add `getCloudSyncEnabled()` helper |
| `src/components/admin/SettingsManagement.tsx` | Add Cloud Sync settings card |
| `src/components/admin/OrderHistoryManagement.tsx` | Add per-shift "Sync Orders" button |

