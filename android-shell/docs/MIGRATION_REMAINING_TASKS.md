# Speypos Android Shell Migration: Remaining Tasks

This document tracks the remaining engineering and operational tasks required to complete the migration from the Termux/NodeJS runtime to the Native Android Shell.

## 🔴 Phase 4: Recovery and Sync (Active)
Goal: Complete the native durability and background processing layer.

- [x] **Implement Native RAW TCP Transport** (Priority: P1)
    - [x] Create `PrinterTransport` utility for Raw TCP/9100 communication.
    - [x] Integrate socket send logic into `NativeConfigStore.processPrintQueue`.
    - [x] Handle network-level timeouts and connection failures.
- [x] **Expand Pending Action Model** (Priority: P1)
    - [x] Implement generic `PendingAction` persistence and enqueueing.
    - [x] Update `PrintQueueWorker` to process generic actions.
    - [x] Integrate cloud sync placeholder.
- [x] **Operational Diagnostics** (Priority: P2)
    - [x] Add `getDeadLetterDetails` to `SpeyposNativeBridge`.
    - [x] Implement "Purge Dead Letter" and "Force Retry Action" bridge methods.
    - [ ] Surface detailed last-retry error messages in the PWA Runtime Status screen.

## 🟡 Phase 5: Kiosk Hardening
Goal: Secure the device for POS-only use.

- [ ] **Managed Device Policy Configuration**
    - [ ] Define `DeviceAdmin` or `DPC` (Device Policy Controller) requirements.
    - [ ] Implement `startLockTask()` for Kiosk Mode pinning.
- [ ] **Lifecycle Persistence**
    - [ ] Validate Auto-Boot behavior (App launch on power-on).
    - [ ] Disable system gestures/status bar via managed policy.
- [ ] **Enrollment SOP**
    - [ ] Document the steps for provisioning a new device into Kiosk Mode.

## ⚪ Phase 6: Staged Rollout
Goal: Safe production transition.

- [ ] **Canary Rollout (1-2 Devices)**
    - [ ] Verify print queue durability in a real environment.
    - [ ] Test rollback procedure (reverting to Termux).
- [ ] **Pilot Rollout**
    - [ ] Deploy to a small group of client devices.
    - [ ] Monitor reliability SLOs (Startup crash rate, Print success rate).

## ⚪ Phase 7: Managed Google Play & Submission
Goal: Operationalize distribution.

- [ ] **Private App Submission**
    - [ ] Configure signing for `release` build variant.
    - [ ] Upload to Managed Google Play Console.
- [ ] **Organization Mapping**
    - [ ] Assign app visibility to target Client Organization IDs.
- [ ] **Automated Updates**
    - [ ] Verify that the PWA assets update correctly inside the shell.

## 🏁 Final Retirement
- [ ] **Termux Decommission**
    - [ ] Remove NodeJS/Termux setup scripts from production images.
    - [ ] Update field support runbook to "Native Shell Only".

---
*Last updated: 2026-05-13*
