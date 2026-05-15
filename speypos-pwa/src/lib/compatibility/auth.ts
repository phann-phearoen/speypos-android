import { authApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Staff } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface AuthCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  login(name: string, password: string): Promise<CompatibilityResult<Staff>>;
}

const httpAuthCompatibilityProvider: AuthCompatibilityProvider = {
  provider: 'http',
  login: (name: string, password: string) => authApi.login(name, password),
};

const nativeAuthCompatibilityProvider: AuthCompatibilityProvider = {
  provider: 'native',
  login: async (name: string, password: string) => {
    const result = callNativeBridge<Staff>('login', JSON.stringify({ name, password }));
    if (!result.error) {
      return result;
    }

    // Fallback to HTTP if native bridge fails or method is missing
    return httpAuthCompatibilityProvider.login(name, password);
  },
};

function resolveProvider(provider: RuntimeApiProvider): AuthCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeAuthCompatibilityProvider;
    case 'http':
    default:
      return httpAuthCompatibilityProvider;
  }
}

export function getAuthCompatibilityProvider(): AuthCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
