import { settingsApi, storeApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Setting, Store } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SettingsCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getAllSettings(): Promise<CompatibilityResult<Setting[]>>;
  getStore(): Promise<CompatibilityResult<Store>>;
  updateStore(data: any): Promise<CompatibilityResult<Store>>;
  upsertSetting(key: string, data: any): Promise<CompatibilityResult<Setting>>;
}

const httpSettingsCompatibilityProvider: SettingsCompatibilityProvider = {
  provider: 'http',
  getAllSettings: () => settingsApi.getAll(),
  getStore: () => storeApi.get(),
  updateStore: (data) => storeApi.update(data),
  upsertSetting: (key, data) => settingsApi.upsert(key, data),
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
  updateStore: async (data) => {
    const result = callNativeBridge<Store>('updateStore', JSON.stringify(data));
    if (!result.error) {
      return result;
    }

    return httpSettingsCompatibilityProvider.updateStore(data);
  },
  upsertSetting: async (key, data) => {
    const result = callNativeBridge<Setting>('upsertSetting', key, JSON.stringify(data));
    if (!result.error) {
      return result;
    }

    return httpSettingsCompatibilityProvider.upsertSetting(key, data);
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