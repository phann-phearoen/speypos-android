import { setupApi, systemApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { PendingActionsStatus, RuntimeStatus } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SetupStatus {
  initialized: boolean;
}

export interface SystemCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getSetupStatus(): Promise<CompatibilityResult<SetupStatus>>;
  getPendingActions(): Promise<CompatibilityResult<PendingActionsStatus>>;
  getRuntimeStatus(): Promise<CompatibilityResult<RuntimeStatus>>;
  triggerRetry(): Promise<CompatibilityResult<null>>;
}

const httpSystemCompatibilityProvider: SystemCompatibilityProvider = {
  provider: 'http',
  getSetupStatus: () => setupApi.getStatus(),
  getPendingActions: () => systemApi.getPendingActions(),
  getRuntimeStatus: () => systemApi.getRuntimeStatus(),
  triggerRetry: () => systemApi.triggerRetry(),
};

const nativeSystemCompatibilityProvider: SystemCompatibilityProvider = {
  provider: 'native',
  getSetupStatus: async () => {
    const result = callNativeBridge<SetupStatus>('getSetupStatus');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.getSetupStatus();
  },
  getPendingActions: async () => {
    const result = callNativeBridge<PendingActionsStatus>('getPendingActions');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.getPendingActions();
  },
  getRuntimeStatus: async () => {
    const result = callNativeBridge<RuntimeStatus>('getRuntimeStatus');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.getRuntimeStatus();
  },
  triggerRetry: () => httpSystemCompatibilityProvider.triggerRetry(),
};

function resolveProvider(provider: RuntimeApiProvider): SystemCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeSystemCompatibilityProvider;
    case 'http':
    default:
      return httpSystemCompatibilityProvider;
  }
}

export function getSystemCompatibilityProvider(): SystemCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}