# Native Android WebView Migration Blueprint

## 1. Purpose

This blueprint locks the migration strategy from the current Android Termux runtime to a Native Android WebView App architecture with private enterprise distribution.

The plan is optimized for:
- Reliability on production POS devices.
- Minimum business-logic regression risk.
- Maximum reuse of existing React frontend and domain behavior.
- Fast iteration with AI-assisted development in VS Code Insiders.

## 2. Locked Decisions

The following decisions are final for this migration track:

1. Runtime target
- Migrate from React PWA + Node backend on Termux to Native Android WebView App.

2. Distribution model
- Distribute using Managed Google Play Private Apps (enterprise/private, not public listing).

3. Development environment
- Primary coding and AI workflow in VS Code Insiders.
- Android Studio used for Android SDK, emulator/device tooling, build diagnostics, signing, and release operations.

4. Migration style
- Compatibility-first strangler migration (incremental replacement, no big-bang rewrite).

## 3. Scope and Non-Goals

### In scope

- Build a production-grade Android shell app that hosts bundled web assets in WebView.
- Preserve most React UI and flows from the current frontend.
- Replace Termux process/deploy lifecycle with Android-native lifecycle control.
- Incrementally port backend capabilities from Node runtime into Android-native modules.
- Establish private release pipeline through Managed Google Play Private Apps.

### Out of scope (for initial migration)

- Public Google Play listing strategy.
- iOS app parity.
- Large UI redesign not required by runtime migration.
- New product features unrelated to migration reliability.

## 4. Current-State Constraints

Current production concerns that this blueprint addresses:
- PWA occasionally fails to load in production mode.
- Kiosk mode and lifecycle persistence are not consistently guaranteed.
- Runtime reliability currently depends on Termux scripts and external process behavior.

Migration must preserve key business guarantees:
- Offline-first ordering.
- Durable local writes before external side effects.
- Recovery of unprinted/unreported operations after interruption.
- Controlled sync retries and eventual consistency.

## 5. Target Architecture (High Level)

## 5.1 Application layers

1. Android Shell (native)
- Single-purpose POS application.
- WebView host for bundled frontend assets.
- Kiosk and lifecycle controls (Lock Task, boot behavior, foreground execution policy where needed).

2. Frontend (reused)
- Existing React app built to static assets.
- Loaded from application assets, not dynamically deployed by Termux.

3. Native Core Services (new)
- Local persistence and repositories (SQLite/Room-based).
- Background jobs and retries (WorkManager).
- Print queue + retry orchestration.
- Sync queue + backoff and dead-letter semantics.

4. Integration boundary
- Stable compatibility contract so frontend request/response behavior remains consistent while backend internals are migrated.

## 5.2 Architectural principles

- Keep frontend API contracts stable during migration.
- Migrate by vertical behavior slices, not by broad technical rewrites.
- Preserve existing business rules first, optimize later.
- Every migrated slice must have parity tests and rollback path.

## 6. Reuse Strategy

## 6.1 Reuse as-is (highest confidence)

- Most React UI components/pages/hooks and app flows.
- Domain constants and payload structures.
- Existing lifecycle acceptance scenarios and operational checklists.

## 6.2 Reuse as reference/spec

- Node services and repositories as behavior source for native implementations.
- Existing docs and API definitions as migration contracts.

## 6.3 Replace entirely

- Termux boot/start/deploy/watchdog operational scripts.
- Node on-device runtime dependencies for production operation.

## 7. Delivery Phases

## Phase 0: Foundation and freeze

Goal:
- Stabilize migration baseline and eliminate ambiguity.

Outputs:
- Finalized migration blueprint (this document).
- Frozen API contract baseline.
- Critical behavior inventory (order, payment, print, recovery, sync).
- Pilot acceptance metrics and pass/fail thresholds.

Exit criteria:
- Team agrees on locked scope, release ring strategy, and rollback rules.

## Phase 1: Android shell and asset hosting

Goal:
- Deliver a stable Android app that renders bundled frontend assets reliably.

Outputs:
- Android WebView host app skeleton.
- Build step that packages frontend assets into app assets.
- Startup/error fallback screen and deterministic load policy.
- Initial kiosk baseline (single-app mode behavior where feasible).

Exit criteria:
- App cold-starts and resumes reliably on pilot devices.
- No Termux dependency required for frontend loading.

## Phase 2: Compatibility boundary and read paths

Goal:
- Keep frontend mostly unchanged while introducing native backend compatibility layer.

Outputs:
- Compatibility interfaces with stable DTOs.
- Migrated read-heavy modules first (settings/catalog/system status).
- Contract and parity tests for migrated endpoints.

Exit criteria:
- React frontend works against compatibility layer with minimal code changes.

## Phase 3: Transactional core migration

Goal:
- Port critical write paths and receipt flow safely.

Outputs:
- Native implementation of order creation/finalization semantics.
- Durable print queue with retry and duplicate prevention.
- Money normalization and totals parity with existing logic.

Exit criteria:
- Transaction and print parity tests pass against baseline scenarios.

## Phase 4: Sync and recovery migration

Goal:
- Port background sync, retry, and crash/power-loss recovery.

Outputs:
- WorkManager jobs for sync retry and recovery tasks.
- Recovery orchestration equivalent to startup watchdog behavior.
- Operational diagnostics and status reporting for field support.

Exit criteria:
- Offline/online transition tests and recovery matrix pass.

## Phase 5: Distribution hardening and rollout

Goal:
- Operationalize release management for private client fleets.

Outputs:
- Managed Google Play Private Apps release process.
- Signed build pipeline and release ring workflow.
- Device enrollment/profile standards for kiosk policy.

Exit criteria:
- Successful controlled rollout across canary and pilot rings.

## Phase 6: Termux retirement

Goal:
- Remove production dependence on old runtime path.

Outputs:
- Formal deprecation of Termux scripts for production.
- Support playbook updated for native-only operations.
- Legacy rollback window and end-of-support date for old path.

Exit criteria:
- Native path meets reliability targets for agreed soak period.

## 8. Reliability Gates (Must Pass)

The migration is not complete until all of the following are green:

1. Reboot recovery
- Reboot during idle and active order recovers without manual intervention.

2. Lock/unlock continuity
- Active cart and transaction state remain consistent through lock/unlock.

3. Offline durability
- Orders remain fully operable offline and sync later without data loss.

4. Print resilience
- Print retry and duplicate-prevention behavior is deterministic.

5. Overnight readiness
- 8+ hour idle results in morning-ready state without operator troubleshooting.

6. Crash/process interruption
- Forced termination scenarios recover using native lifecycle/recovery mechanisms.

7. Kiosk persistence
- App remains in operational mode with restricted escape behavior on managed devices.

## 9. Release and Distribution Model

## 9.1 Private app distribution

- Use Managed Google Play Private Apps for enterprise-only distribution.
- No public listing required.
- Releases follow controlled rings:
  1. Canary (1-2 internal devices).
  2. Pilot (selected client devices).
  3. Broad private rollout.

## 9.2 Versioning and rollback

- Every release produces a signed, immutable artifact.
- Maintain immediate rollback target to prior known-good version.
- Never promote release rings without passing ring-specific checks.

## 10. Tooling and Workflow

## 10.1 VS Code Insiders (primary)

Use for:
- Frontend and Kotlin development.
- AI-assisted code generation and refactoring.
- Contract/parity test authoring.
- Documentation and migration tracking.

## 10.2 Android Studio (required support)

Use for:
- SDK/emulator management.
- Gradle sync and Android build diagnostics.
- Device debugging and profiling.
- Signing and release validation workflows.

## 10.3 AI-driven development policy

- Use AI to generate migration slices from explicit source contracts and behavior tests.
- Require tests in the same change set as implementation for core migration paths.
- Review AI output against business invariants, not style preferences.

## 11. Migration Backlog Structure

Organize work items by vertical slices:

1. Foundation
- Android shell, asset packaging, app startup policy, fallback UI.

2. Compatibility layer
- DTO contracts, adapters, request/response normalization.

3. Core transactional domain
- Order writes, totals, print queue and retry semantics.

4. Recovery and sync
- Startup reconciliation, retry jobs, status visibility.

5. Kiosk operations
- Lock task policy, boot behavior, managed-device policy integration.

6. Distribution operations
- Ring promotion, rollback process, release evidence package.

## 12. Risks and Mitigations

1. Risk: Business logic drift during porting
- Mitigation: Contract and parity tests before promoting slices.

2. Risk: Hidden lifecycle regressions
- Mitigation: Device-level soak tests for reboot/sleep/lock scenarios.

3. Risk: Over-ambitious big-bang rewrite
- Mitigation: Enforce incremental strangler migration with ringed rollout.

4. Risk: Slow team throughput during Android transition
- Mitigation: Keep React surface stable and use AI-assisted Kotlin scaffolding.

5. Risk: Operational blind spots after Termux removal
- Mitigation: Build native diagnostics and field support playbooks before full cutover.

## 13. Governance and Change Control

- Any change to the locked decisions in Section 2 requires explicit written amendment in this blueprint.
- Production rollout requires sign-off from engineering and operations leads after reliability gates pass.
- Emergency fixes must still preserve signed artifact traceability and rollback readiness.

## 14. Definition of Done (Program Level)

Migration is complete when:

1. Native Android WebView app is the default production runtime.
2. Managed Google Play Private Apps is the active distribution channel.
3. Reliability gates are passed on pilot and production rings.
4. Termux runtime is formally retired from production operations.
5. Support runbook and escalation process are updated to native-only workflows.

## 15. Immediate Next Actions

1. Create Android shell project and commit baseline app skeleton.
2. Add automated frontend asset packaging into Android build process.
3. Freeze and publish compatibility contract baseline for frontend integration.
4. Build migration backlog by vertical slices and assign owners.
5. Start Phase 1 canary validation on two managed test devices.
