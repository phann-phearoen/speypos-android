# Cloud Sync Overview

Setting: cloud.sync (json)

- version: 1
- enabled: boolean
- api_key: string
- base_url: string
- store_id: string (set via handshake)
- store_linked_at: string|null (from handshake)
- store_client_name: string|null (from handshake)
- store_last_seen_at: string|null (from handshake)
- Workflow:
  - During an active shift, finalized orders are uploaded in background mini-batches when unsynced count reaches SYNC_MINI_BATCH_SIZE (from .env, default 20).
  - Mini-batch processing is guarded to the currently active shift only.
  - Closing a shift enqueues a background flush job that drains remaining finalized unsynced orders in mini-batch chunks.
  - Only orders (items, customizations, toppings, payments) are sent.
  - Orders are marked with cloud_sync_at when successfully uploaded to avoid duplicates.
- Handshake:
  - Saving cloud.sync via settings PUT auto-runs POST /pos/handshake with X-Api-Key to resolve cloud store_id.
  - On handshake failure, the settings update is rejected (nothing is persisted).
  - Uploads require cloud.sync.store_id; if missing, sync aborts and retries later.
- Manual upload:
  - POST /api/sync/orders with JSON { "shift_id": "<shift uuid>" } and header X-User-Role: admin
  - Enqueues a background flush job for the target shift and triggers processing asynchronously.
- Retry behavior:
  - Queue keeps failed jobs with retry_count/last_attempt_at; failed mini-batches are retried by the same queue flow on later processing cycles.
  - Processing restarts at service start.
- External contract:
  - Uses docs/pos-client-link.yml event batch + events with ORDER_CREATED payloads including order structure.
