import { syncApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SyncCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  syncOrders(shiftId: string): Promise<CompatibilityResult<{ enqueued: boolean }>>;
}

const httpSyncCompatibilityProvider: SyncCompatibilityProvider = {
  provider: 'http',
  syncOrders: (shiftId: string) => syncApi.syncOrders(shiftId),
};

const nativeSyncCompatibilityProvider: SyncCompatibilityProvider = {
  provider: 'native',
  syncOrders: async (shiftId: string) => {
    const result = callNativeBridge<{ enqueued: boolean }>('syncOrders', shiftId);
    if (!result.error) {
      return result;
    }

    return httpSyncCompatibilityProvider.syncOrders(shiftId);
  },
};

function resolveProvider(provider: RuntimeApiProvider): SyncCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeSyncCompatibilityProvider;
    case 'http':
    default:
      return httpSyncCompatibilityProvider;
  }
}

export function getSyncCompatibilityProvider(): SyncCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
