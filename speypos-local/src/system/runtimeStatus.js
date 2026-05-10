import { logger } from '../utils/logger.js';

const state = {
  startupPhase: 'booting',
  recoveryRunning: false,
  degraded: false,
  degradedReasons: [],
  lastRecoveryRun: null,
  updatedAt: new Date().toISOString(),
};

function touch() {
  state.updatedAt = new Date().toISOString();
}

function normalizeReasons(reasons) {
  return Array.from(new Set((reasons || []).filter(Boolean)));
}

export function setStartupPhase(phase) {
  if (!phase || state.startupPhase === phase) {
    return;
  }

  state.startupPhase = phase;
  touch();
  logger.info('Runtime startup phase changed.', {
    event: 'runtime.startup_phase',
    phase,
  });
}

export function setRecoveryRunning(running, context = 'startup') {
  const next = Boolean(running);
  if (state.recoveryRunning === next) {
    return;
  }

  state.recoveryRunning = next;
  touch();
  logger.info('Runtime recovery state changed.', {
    event: 'runtime.recovery_state',
    running: next,
    context,
  });
}

export function recordRecoveryResult({ context = 'startup', printRetry, telegramRetry }) {
  state.lastRecoveryRun = {
    context,
    at: new Date().toISOString(),
    printRetry: printRetry || null,
    telegramRetry: telegramRetry || null,
  };

  touch();
  logger.info('Recovery sweep completed.', {
    event: 'runtime.recovery_complete',
    context,
    printRetry,
    telegramRetry,
  });
}

export function recordRecoveryError(error, context = 'startup') {
  state.lastRecoveryRun = {
    context,
    at: new Date().toISOString(),
    error: error?.message || String(error),
  };
  touch();
  setDegradedReasons(['recovery_failed'], 'recovery');
}

export function setDegradedReasons(reasons, source = 'system') {
  const normalized = normalizeReasons(reasons);
  const previous = state.degraded;

  state.degradedReasons = normalized;
  state.degraded = normalized.length > 0;
  touch();

  const transitioned = previous !== state.degraded;
  if (transitioned) {
    logger.warn('Runtime degraded mode transition.', {
      event: 'runtime.degraded_transition',
      degraded: state.degraded,
      reasons: normalized,
      source,
    });
  }
}

export function getRuntimeStatus() {
  return {
    startupPhase: state.startupPhase,
    recoveryRunning: state.recoveryRunning,
    degraded: state.degraded,
    degradedReasons: [...state.degradedReasons],
    lastRecoveryRun: state.lastRecoveryRun,
    updatedAt: state.updatedAt,
  };
}
