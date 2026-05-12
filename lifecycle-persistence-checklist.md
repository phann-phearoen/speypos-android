# Android POS Lifecycle Persistence Checklist

Use this as a deployment runbook per device. Check each box only after verification.

## A. Base Provisioning

- [ ] Device is dedicated to POS use only (no personal apps).
- [ ] Auto time/date and correct timezone are enabled.
- [ ] Screen timeout policy is set for operations (or kiosk-managed).
- [ ] Device remains on charger during business hours.
- [ ] Developer option "Stay awake while charging" is enabled (if policy allows).

## B. App and Runtime Installation

- [ ] Termux installed and updated.
- [ ] Termux:Boot installed.
- [ ] Browser/PWA runtime installed and pinned (Chrome or kiosk browser).
- [ ] Initial setup completed via `scripts/termux/setup.sh`.
- [ ] Start/stop/status scripts are executable and working:
  - [ ] `scripts/termux/start.sh`
  - [ ] `scripts/termux/stop.sh`
  - [ ] `scripts/termux/status.sh`

## C. Boot Persistence

- [ ] Boot hook exists in Termux:Boot and launches successfully via `scripts/termux/boot.sh`.
- [ ] Watchdog starts after reboot and writes runtime logs.
- [ ] After reboot test, backend health endpoint returns success within target startup time.
- [ ] No duplicate watchdog process after repeated starts (PID guard validated).

## D. Sleep/Doze Persistence

- [ ] Battery optimization is disabled for Termux, Termux:Boot, and browser/kiosk app.
- [ ] OEM background restrictions are disabled (Samsung/Xiaomi/Oppo/etc specific settings).
- [ ] Wake lock strategy defined:
  - [ ] Shift start acquires wake lock.
  - [ ] Shift end releases wake lock.
- [ ] Device survives 30+ minutes idle sleep and resumes without manual restart.

## E. Lock/Unlock Persistence

- [ ] Lock screen event does not lose active cart/order context.
- [ ] Unlock triggers state reconciliation:
  - [ ] Recover draft order.
  - [ ] Recheck unsent sync queue.
  - [ ] Recheck pending print queue.
- [ ] Mid-payment lock/unlock scenario tested and data remains consistent.

## F. Restart/Crash Recovery

- [ ] Forced backend kill is auto-restarted by watchdog from `scripts/termux/watchdog.sh`.
- [ ] Health-check failures trigger restart behavior as expected.
- [ ] Power-loss simulation validated:
  - [ ] paid-not-printed recovers to print retry path.
  - [ ] printed-not-synced recovers to sync retry path.
  - [ ] draft orders can be restored or safely discarded by policy.
- [ ] Data file paths are Termux-safe (no /tmp dependency).

## G. Offline and Sync Durability

- [ ] Offline mode is explicit in UI and operational.
- [ ] Every outbound operation is queued locally before remote sync.
- [ ] Sync retries use backoff and stop at a defined threshold.
- [ ] Dead-letter handling exists for permanently failing records.
- [ ] Duplicate-safe idempotency key exists per order/payment event.

## H. Printer and Peripheral Resilience

- [ ] Printer disconnect/reconnect tested during active checkout.
- [ ] Receipt jobs are durable and retried after app/process restart.
- [ ] Duplicate print prevention logic validated on recovery paths.

## I. Monitoring and Diagnostics

- [ ] Runtime logs are readable and rotated to avoid storage bloat.
- [ ] Health endpoint monitored locally.
- [ ] Daily operator check includes `scripts/termux/status.sh`.
- [ ] Incident playbook includes:
  - [ ] soft restart path via `scripts/termux/restart.sh`
  - [ ] log collection path via `scripts/termux/logs.sh`

## J. Kiosk and Operational Hardening

- [ ] App pinning or kiosk mode enabled.
- [ ] Exit-from-app is restricted for cashier role.
- [ ] Auto-launch to POS on boot confirmed.
- [ ] Update window defined (outside operating hours).

## K. Acceptance Test Matrix (Must Pass)

- [ ] Test 1: Reboot during idle -> system auto-recovers.
- [ ] Test 2: Reboot during active order -> no data corruption.
- [ ] Test 3: Network loss during payment/sync -> eventual consistency.
- [ ] Test 4: Screen lock during order -> seamless resume.
- [ ] Test 5: Overnight idle (8+ hours) -> morning ready state without manual intervention.
- [ ] Test 6: Forced process kill x3 -> watchdog restores each time.

## L. Go-Live Gate

- [ ] All sections A-K completed on at least 2 pilot devices.
- [ ] Zero critical failures in 7-day pilot.
- [ ] Recovery steps can be performed by on-site staff in under 3 minutes.
- [ ] Final sign-off recorded with device model + Android version + build hash.
