# Migration Execution Plan

This document is the operational companion to the migration blueprint and defines the step-by-step execution path from Termux retirement to Android private app submission.

## 1. Goal and Outcome

Goal:
- Replace Termux-based production runtime with a Native Android WebView App runtime.

Outcome:
- Android app is distributed via Managed Google Play Private Apps, with proven reliability gates and rollback readiness.

## 2. Migration Sequence Overview

1. Prepare and freeze migration baseline.
2. Build Android shell and deterministic WebView asset loading.
3. Introduce compatibility boundary and keep frontend stable.
4. Port transactional backend logic to native modules.
5. Port recovery, sync, and operational diagnostics.
6. Validate kiosk and lifecycle persistence on managed devices.
7. Run staged private rollout.
8. Retire Termux from production.
9. Submit and promote through Managed Google Play Private Apps.

## 3. Phase-by-Phase Execution

## Phase 0: Baseline Freeze and Planning

Objective:
- Lock behavior baseline before runtime migration begins.

Tasks:
1. Freeze API contract baseline from current local backend.
2. Capture critical user journeys and edge cases:
- setup/init,
- order create/finalize,
- print and reprint,
- shift open/close,
- offline queue and sync,
- startup recovery after interruption.
3. Define release rings and rollback policy.
4. Select pilot device models and Android versions.
5. Record baseline reliability metrics from current production and pilot devices.

Deliverables:
- Baseline contract package.
- Reliability baseline report.
- Ring rollout policy.

Exit criteria:
- Engineering and operations approve baseline artifacts.

## Phase 1: Android Shell Foundation

Objective:
- Stand up a native Android shell hosting bundled React assets.

Tasks:
1. Create Android app project with Kotlin.
2. Add WebView host activity and deterministic startup policy.
3. Configure web settings (JS, DOM storage, file access) and in-app navigation policy.
4. Add startup failure fallback UI and log surface.
5. Add boot behavior foundation for kiosk-managed devices.
6. Add Gradle task/pipeline to copy built frontend artifacts into app assets.

Deliverables:
- Installable debug APK.
- WebView app that loads packaged frontend assets offline.

Exit criteria:
- App starts reliably across cold start and resume on pilot devices.

## Phase 2: Frontend Compatibility Boundary

Objective:
- Keep React application mostly unchanged while backend internals migrate.

Tasks:
1. Define compatibility interfaces and DTOs matching existing API behavior.
2. Implement adapter layer for frontend API calls.
3. Migrate read-oriented paths first (settings/catalog/system status).
4. Add parity tests comparing old and new responses for migrated endpoints.

Deliverables:
- Compatibility layer with validated read paths.
- Frontend running with minimal behavioral deltas.

Exit criteria:
- Core read flows pass parity tests and QA scenarios.

## Phase 3: Transactional Core Port

Objective:
- Migrate critical write and receipt behavior with strict parity controls.

Tasks:
1. Port order creation/finalization logic.
2. Port money normalization and totals calculation.
3. Implement native persistence writes with transactional integrity.
4. Implement print queue, retry policy, and duplicate print prevention.
5. Add test suite for transactional and printing invariants.

Deliverables:
- Native transactional core with parity test evidence.

Exit criteria:
- Order and print critical path passes all high-severity scenarios.

## Phase 4: Recovery and Sync Port

Objective:
- Replace watchdog-style recovery and queue processing with native lifecycle primitives.

Tasks:
1. Implement startup reconciliation flow for pending actions.
2. Implement sync queue with retry/backoff/dead-letter behavior.
3. Implement background jobs using Android-native scheduling.
4. Add diagnostics endpoints/screens/log export for field support.
5. Validate crash/power-loss/airplane-mode recovery scenarios.

Deliverables:
- Native recovery and sync services with observability.

Exit criteria:
- Recovery matrix and offline/online durability matrix pass on pilot devices.

## Phase 5: Kiosk Hardening and Device Management

Objective:
- Enforce managed POS behavior on enterprise devices.

Tasks:
1. Configure managed device policy and kiosk restrictions.
2. Implement or finalize lock-task flow as required by policy.
3. Validate boot auto-launch and return-to-app behavior.
4. Define device enrollment SOP for new clients.
5. Define support SOP for device replacement and reprovisioning.

Deliverables:
- Kiosk policy profile.
- Enrollment and support runbooks.

Exit criteria:
- No critical kiosk escape/reliability failures in soak testing.

## Phase 6: Staged Rollout and Termux Decommission

Objective:
- Shift production safely while preserving rollback options.

Tasks:
1. Canary rollout (1-2 internal managed devices).
2. Pilot rollout (selected client devices).
3. Broad private rollout after gate approval.
4. Keep Termux runtime available only as rollback path during defined grace period.
5. Cut production default to native app.
6. End grace period and retire Termux scripts from production playbook.

Deliverables:
- Signed release evidence by ring.
- Formal Termux decommission record.

Exit criteria:
- Native runtime meets reliability SLO for agreed soak period.

## Phase 7: Managed Google Play Private Apps Submission and Promotion

Objective:
- Operationalize private distribution lifecycle.

Tasks:
1. Prepare signed release bundle and release notes.
2. Upload to Managed Google Play private channel.
3. Assign app visibility to target organizations/groups.
4. Configure staged update policy by release ring.
5. Validate install/update on enrolled devices.
6. Promote ring-to-ring based on gate checks.

Deliverables:
- Private app release live for target organizations.
- Signed-off rollout checklist and rollback target.

Exit criteria:
- Private app distribution and update flow confirmed stable.

## 4. Termux Retirement Checklist

Termux may be retired only when all items are complete:

1. Native app covers all critical operations:
- order lifecycle,
- printing,
- sync,
- recovery,
- shift operations.
2. Native diagnostics and incident response runbook are in place.
3. Pilot and production rings pass reliability gates.
4. Rollback plan exists and is tested at least once.
5. Operations team signs off native-only support readiness.

## 5. Android App Submission Checklist (Private Apps)

1. Build and signing
- Release build generated from tagged commit.
- Signing keys and versioning policy verified.

2. Compliance and app metadata
- App name/icon/version finalized.
- Organization/internal support contact included.

3. Distribution setup
- Managed Google Play private visibility configured.
- Device groups/rings mapped to deployment policy.

4. Validation
- Fresh install test on enrolled device.
- Upgrade test from prior production version.
- Rollback test to previous known-good release.

5. Release governance
- Approval from engineering and operations.
- Change record with artifact hashes and promotion timestamps.

## 6. Testing Matrix (Release Gate)

All release candidates must pass:

1. Cold start and warm resume.
2. Reboot during idle and active order.
3. Lock/unlock continuity during active transaction.
4. Offline order capture and delayed sync replay.
5. Printer disconnect/reconnect and retry behavior.
6. Overnight idle readiness.
7. Forced process interruption and recovery.
8. Kiosk persistence and managed policy compliance.

## 7. Rollback Plan

1. Keep previous signed release artifact immediately available.
2. Define ring-specific rollback triggers:
- startup crash threshold,
- transaction failure threshold,
- print failure threshold,
- sync backlog growth threshold.
3. Execute rollback by ring, not all devices at once.
4. Capture incident evidence and root-cause actions before re-promotion.

## 8. Ownership Model

1. Migration lead
- Scope control, dependency sequencing, gate approvals.

2. Frontend lead
- Compatibility layer integration and UI parity verification.

3. Android lead
- Native shell, platform services, kiosk policies, build pipeline.

4. QA lead
- Parity tests, device soak runs, release-gate evidence.

5. Operations lead
- Device enrollment, rollout promotion, incident response.

## 9. Suggested Timeline (Practical)

1. Weeks 1-2
- Phase 0 and Phase 1 complete.

2. Weeks 3-4
- Phase 2 complete with read-path parity.

3. Weeks 5-7
- Phase 3 complete with transactional and print parity.

4. Weeks 8-9
- Phase 4 complete with recovery and sync stability.

5. Weeks 10-11
- Phase 5 and early Phase 6 canary/pilot rollout.

6. Week 12
- Phase 7 promotion and formal Termux production retirement.

## 10. Change Control

Any change to this execution plan that affects:
- rollout order,
- rollback policy,
- reliability gates,
- or Termux retirement criteria,
requires documented approval by engineering and operations.

## 11. Development and Validation Operating Model

This repository and workspace are used for coding, technical configuration, build wiring, migration scaffolding, and engineering-level verification hooks.

Manual QA execution, device validation, kiosk validation, operational acceptance, and rollout sign-off are managed outside this workspace.

In practice:
- This workspace is the source of truth for implementation progress and technical readiness.
- External QA systems or operational trackers are the source of truth for manual validation results.
- This document records when a phase or slice is ready for external validation and when external validation results are received back.

Status usage in this document:
- Not started: no implementation work merged yet.
- In progress: active implementation started, not yet ready for external validation.
- Ready for external validation: implementation and engineering checks are complete in this workspace; external QA or operational validation is still pending.
- Validated externally: external QA or operational validation has been completed and reported back.
- Blocked: implementation started but cannot proceed due to a known blocker.
- Complete: both implementation scope and required external validation are closed for the phase or scoped milestone.

## 12. Migration Status

Last updated:
- 2026-05-13

Status legend:
- Not started: no implementation work merged yet.
- In progress: active implementation started, not yet ready for external validation.
- Ready for external validation: implementation and engineering checks are complete in this workspace; external QA or operational validation is pending.
- Validated externally: external QA or operational validation has passed and been reported back.
- Blocked: implementation started but cannot proceed due to a known blocker.
- Complete: both implementation scope and required external validation are closed for the phase or scoped milestone.

### Current Status by Phase

1. Phase 0: Baseline Freeze and Planning
- Status: Complete (planning scope).
- Evidence:
	- Migration blueprint and execution plan are defined.
	- Phase sequencing, ownership, and governance model are documented.
	- Release-ring and rollback structure are defined at plan level.
- Next gate:
	- Keep backend-coupled reliability baseline tracking active and close it during Phase 2 to Phase 4 execution.

2. Phase 1: Android Shell Foundation
- Status: Validated externally (shell-foundation scope).
- Evidence:
	- Native shell host activity and startup/error flow exist in android-shell/app/src/main/java/com/speypos/shell/MainActivity.kt.
	- Frontend asset packaging pipeline exists in android-shell/app/build.gradle.kts.
	- First run on test device succeeded.
	- App still launches after WiFi disconnect and after removal from app history (frontend-only path).
- Next gate:
	- Continue reliability hardening under full runtime conditions as backend and kiosk phases mature.
	- Keep later backend-on-device and kiosk-dependent scenarios tracked as deferred cross-phase validation.

3. Phase 2: Frontend Compatibility Boundary
- Status: In progress (menu suite Phase B complete, shift Phase B complete, staff Phase B complete, order Phase B complete).
- Evidence:
	- Compatibility seam for system reads exists in speypos-pwa/src/lib/compatibility/system.ts.
	- Compatibility seam for settings reads exists in speypos-pwa/src/lib/compatibility/settings.ts.
	- Compatibility seam for menu suite reads exists in speypos-pwa/src/lib/compatibility/menu.ts and is consumed by menu-related contexts/components.
	- Runtime API provider selection exists in speypos-pwa/src/lib/runtime-config.ts.
	- Setup, pending-actions, and settings context consumers are routed through compatibility seams.
	- Menu core entities (categories and menu items) now have native bridge-backed reads with HTTP fallback.
	- Menu mapping and option/group read paths are now native bridge-backed with HTTP fallback:
		- menu item/category customization mappings
		- menu item/category topping mappings
		- customization groups/options
		- topping groups/options
	- Bridge and native store coverage for this menu suite slice is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- speypos-pwa/src/lib/compatibility/menu.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Shift entity Phase A compatibility seam exists in speypos-pwa/src/lib/compatibility/shift.ts.
	- Shift read consumers are now routed via the shift compatibility seam:
		- speypos-pwa/src/contexts/ShiftContext.tsx
		- speypos-pwa/src/components/admin/OrderHistoryManagement.tsx
		- speypos-pwa/src/components/pos/DayClosePreviewModal.tsx (preview read path)
	- Native shift read bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Shift entity Phase B action/write paths are routed through the shift compatibility seam:
		- openShift
		- closeShift
		- closeDay
	- Native shift action bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- speypos-pwa/src/lib/compatibility/shift.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Staff entity Phase A compatibility seam exists in speypos-pwa/src/lib/compatibility/staff.ts.
	- Staff read consumers are now routed via the staff compatibility seam:
		- speypos-pwa/src/contexts/ShiftContext.tsx
		- speypos-pwa/src/pages/pos/ShiftPage.tsx
		- speypos-pwa/src/components/pos/ShiftScreen.tsx
		- speypos-pwa/src/components/admin/OrderHistoryManagement.tsx
		- speypos-pwa/src/components/admin/StaffManagement.tsx
	- Native staff read bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Staff entity Phase B action/write paths are routed through the staff compatibility seam:
		- createStaff
		- updateStaff
		- deleteStaff
	- Native staff action bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- speypos-pwa/src/lib/compatibility/staff.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Order entity Phase A compatibility seam exists in speypos-pwa/src/lib/compatibility/order.ts.
	- Order read consumers are now routed via the order compatibility seam:
		- speypos-pwa/src/components/admin/OrderHistoryManagement.tsx
		- speypos-pwa/src/components/pos/ShiftClosePreviewModal.tsx
	- Native order read bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Order entity Phase B transactional write paths are routed through the order compatibility seam:
		- createOrder
		- payOrder
		- voidOrder
		- printReceipt
	- Native order action bridge support is implemented in:
		- speypos-pwa/src/lib/compatibility/nativeBridge.ts
		- speypos-pwa/src/lib/compatibility/order.ts
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
	- Wiring parity check exists: npm --prefix speypos-local run test:refactor11.
	- Live endpoint shape parity check exists: npm --prefix speypos-local run test:refactor12.
	- Latest engineering check run (2026-05-13):
		- npm --prefix speypos-local run test:refactor11: passed.
		- npm --prefix speypos-local run test:refactor12: blocked by backend reachability (http://127.0.0.1:3000 unavailable in this environment).
- Next gate:
	- Execute engineering parity checks for completed menu, shift, staff, and order slices.
	- Mark this slice as Ready for external validation when parity checks are captured against a reachable backend.
	- Begin Phase 3 transactional-core hardening (money normalization invariants, print queue/retry, duplicate-print prevention).
	- Add targeted parity/invariant checks for order transactional semantics and receipt behavior.
	- Keep parity checks passing for migrated compatibility routes.

### Phase 2 Parity Check Runbook

1. Goal
- Verify migrated read paths keep response behavior consistent while compatibility providers are introduced.

2. Prerequisites
- Backend is running in normal mode.
- If backend is not local, set SPEYPOS_PARITY_BASE_URL.

3. Commands
- Wiring parity (provider routing checks):
  - npm --prefix speypos-local run test:refactor11
- Live endpoint shape parity checks:
  - npm --prefix speypos-local run test:refactor12
- Live endpoint shape parity checks against remote backend:
  - SPEYPOS_PARITY_BASE_URL=http://<host>:3000 npm --prefix speypos-local run test:refactor12

4. Endpoint scope (current)
- /api/system/setup-status
- /api/system/runtime-status
- /api/system/pending-actions
- /api/settings

5. Evidence capture
- Record date/time, command used, target base URL, and pass/fail result.
- If failed, store the error output and whether failure is contract drift or environment reachability.
- If passed, mark the relevant slice as Ready for external validation in this document and move detailed QA execution to the external QA tracker.

4. Phase 3: Transactional Core Port
- Status: In progress (hardening kickoff).
- Evidence:
	- Order transactional write paths are routed through the order compatibility seam in:
		- speypos-pwa/src/lib/compatibility/order.ts
		- speypos-pwa/src/pages/pos/PaymentPage.tsx
		- speypos-pwa/src/pages/pos/CompletePage.tsx
	- Native bridge/store now enforce initial transactional guards:
		- Prevent paying a voided order.
		- Prevent voiding a completed order.
		- Make pay operation idempotent for already-paid orders.
		- Prevent duplicate initial prints while allowing explicit reprint mode.
	- Native transactional bridge/store implementation resides in:
		- android-shell/app/src/main/java/com/speypos/shell/SpeyposNativeBridge.kt
		- android-shell/app/src/main/java/com/speypos/shell/NativeConfigStore.kt
- Next gate:
	- Add targeted parity checks for payment, void, and print state transitions.
		- Engineering check added: npm --prefix speypos-local run test:refactor13 (pass on 2026-05-13).
	- Introduce print queue/retry orchestration and duplicate-print prevention parity checks.
	- Expand money-normalization and totals invariants for transactional payloads.

5. Phase 4: Recovery and Sync Port
- Status: Not started.
- Evidence:
	- No Android-native recovery/sync job migration finalized yet.
- Next gate:
	- Implement startup reconciliation and native retry/backoff job primitives.

6. Phase 5: Kiosk Hardening and Device Management
- Status: Not started.
- Evidence:
	- Managed policy and lock-task hardening are not finalized yet.
- Next gate:
	- Define and validate kiosk policy profile on managed pilot devices.

7. Phase 6: Staged Rollout and Termux Decommission
- Status: Not started.
- Evidence:
	- Rollout rings and decommission execution are not started yet.
- Next gate:
	- Execute canary rollout with rollback-path validation.

8. Phase 7: Managed Google Play Private Apps Submission and Promotion
- Status: Not started.
- Evidence:
	- Private app submission and staged promotion workflow are not started yet.
- Next gate:
	- Prepare signed release bundle and validate private-channel upload/install path.

### Current Focus

- Expand Phase 2 read-path compatibility work while maintaining Phase 1 shell stability.
- Short-term blocker to close:
	- Local Gradle debug assembly is currently blocked by missing Java runtime in this environment.

### External QA Handoff Rule

- Use this workspace to implement code, build/config changes, and engineering verification hooks.
- Use an external QA tracker to manage device testing, kiosk testing, backend-on-device validation, and operational acceptance.
- Bring only summarized external outcomes back into this document, such as:
	- Ready for external validation,
	- Validated externally,
	- External validation failed with follow-up coding required.

### Deferred Cross-Phase Validation Notes

- Phase 0 backend-coupled reliability evidence is intentionally deferred:
	- setup/init,
	- order create/finalize,
	- print and reprint,
	- shift open/close,
	- offline queue and sync replay,
	- startup recovery after interruption.
- Phase 1 full operational reliability is intentionally deferred and will be closed progressively with later phases:
	- backend-on-device runtime behavior,
	- managed-device kiosk policies,
	- release-gate matrix scenarios that require transactional, sync, and kiosk features.
