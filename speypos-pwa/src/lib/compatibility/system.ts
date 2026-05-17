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
  initialize(data: any): Promise<CompatibilityResult<{ message: string }>>;
  getPendingActions(): Promise<CompatibilityResult<PendingActionsStatus>>;
  getRuntimeStatus(): Promise<CompatibilityResult<RuntimeStatus>>;
  triggerRetry(): Promise<CompatibilityResult<null>>;
  getDeadLetterDetails(): Promise<CompatibilityResult<any>>;
  purgeDeadLetters(): Promise<CompatibilityResult<any>>;
  forceRetryAction(actionId: string): Promise<CompatibilityResult<any>>;
  reboot(): Promise<CompatibilityResult<any>>;
  exportData(mode: 'menu' | 'full'): Promise<CompatibilityResult<any>>;
  importData(payload: any): Promise<CompatibilityResult<any>>;
  downloadFile(jsonString: string, filename: string): Promise<CompatibilityResult<boolean>>;
}

const httpSystemCompatibilityProvider: SystemCompatibilityProvider = {
  provider: 'http',
  getSetupStatus: () => setupApi.getStatus(),
  initialize: (data: any) => setupApi.initialize(data),
  getPendingActions: () => systemApi.getPendingActions(),
  getRuntimeStatus: () => systemApi.getRuntimeStatus(),
  triggerRetry: () => systemApi.triggerRetry(),
  getDeadLetterDetails: async () => ({ data: null, error: 'Not implemented for HTTP' }),
  purgeDeadLetters: async () => ({ data: null, error: 'Not implemented for HTTP' }),
  forceRetryAction: async () => ({ data: null, error: 'Not implemented for HTTP' }),
  reboot: () => systemApi.reboot(),
  exportData: (mode) => systemApi.exportData(mode),
  importData: (payload) => systemApi.importData(payload),
  downloadFile: async () => ({ data: false, error: 'Not implemented for HTTP' }),
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
  initialize: async (data: any) => {
    const result = callNativeBridge<{ message: string }>('initialize', JSON.stringify(data));
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.initialize(data);
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
  triggerRetry: async () => {
    const result = callNativeBridge<unknown>('triggerPrintQueueRetry');
    if (!result.error) {
      return { data: null, error: null };
    }

    return httpSystemCompatibilityProvider.triggerRetry();
  },
  getDeadLetterDetails: async () => {
    const result = callNativeBridge<any>('getDeadLetterDetails');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.getDeadLetterDetails();
  },
  purgeDeadLetters: async () => {
    const result = callNativeBridge<any>('purgeDeadLetters');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.purgeDeadLetters();
  },
  forceRetryAction: async (actionId: string) => {
    const result = callNativeBridge<any>('forceRetryAction', actionId);
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.forceRetryAction(actionId);
  },
  reboot: async () => {
    const result = callNativeBridge<any>('hardRestart');
    if (!result.error) {
      return result;
    }

    return httpSystemCompatibilityProvider.reboot();
  },
  exportData: async (mode: 'menu' | 'full') => {
    const result = callNativeBridge<any>('exportData', mode);
    if (!result.error) {
      return result;
    }
    return httpSystemCompatibilityProvider.exportData(mode);
  },
  importData: async (payload: any) => {
    const result = callNativeBridge<any>('importData', JSON.stringify(payload));
    if (!result.error) {
      return result;
    }
    return httpSystemCompatibilityProvider.importData(payload);
  },
  downloadFile: async (jsonString: string, filename: string) => {
    return callNativeBridge<boolean>('downloadFile', jsonString, filename);
  },
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