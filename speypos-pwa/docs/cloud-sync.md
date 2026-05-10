# Cloud Sync Overview

Setting: cloud.sync (json)

- version: 1
- enabled: boolean
- api_key: string
- base_url: string
- Workflow:
  - Closing a shift enqueues an orders sync job; queue processes in background.
  - Only orders (items, customizations, toppings, payments) are sent.
  - Orders are marked with cloud_sync_at when successfully uploaded to avoid duplicates.
- Manual upload:
  - POST /api/sync/orders with JSON { "shift_id": "<shift uuid>" } and header X-User-Role: admin
  - Enqueues the same job and triggers processing asynchronously.
- Retry behavior:
  - Queue keeps failed jobs with retry_count/last_attempt_at; processing restarts at service start.
- External contract:
  - Uses docs/pos-client-link.yml event batch + events with ORDER_CREATED payloads including order structure.
