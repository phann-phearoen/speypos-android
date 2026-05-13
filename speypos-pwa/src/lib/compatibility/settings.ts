import { settingsApi, storeApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Setting, Store } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SettingsCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getAllSettings(): Promise<CompatibilityResult<Setting[]>>;
  getStore(): Promise<CompatibilityResult<Store>>;
}

const httpSettingsCompatibilityProvider: SettingsCompatibilityProvider = {
  provider: 'http',
  getAllSettings: () => settingsApi.getAll(),
  getStore: () => storeApi.get(),
};

const nativeSettingsCompatibilityProvider: SettingsCompatibilityProvider = {
  provider: 'native',
  getAllSettings: async () => {
    const result = callNativeBridge<Setting[]>('getAllSettings');
    if (!result.error) {
      return result;
    }

    return httpSettingsCompatibilityProvider.getAllSettings();
  },
  getStore: async () => {
    const result = callNativeBridge<Store>('getStore');
    if (!result.error) {
      return result;
    }

    return httpSettingsCompatibilityProvider.getStore();
  },
};

function resolveProvider(provider: RuntimeApiProvider): SettingsCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeSettingsCompatibilityProvider;
    case 'http':
    default:
      return httpSettingsCompatibilityProvider;
  }
}

export function getSettingsCompatibilityProvider(): SettingsCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}