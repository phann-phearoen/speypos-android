function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export type RuntimeApiProvider = 'http' | 'native';

export interface SpeyposRuntimeConfig {
  backendUrl?: string;
  apiBaseUrl?: string;
  appBaseUrl?: string;
  disableServiceWorker?: boolean;
  apiProvider?: RuntimeApiProvider;
}

declare global {
  interface Window {
    __SPEYPOS_RUNTIME__?: SpeyposRuntimeConfig;
    SpeyposNativeBridge?: import('@/lib/compatibility/nativeBridge').SpeyposNativeBridge;
  }
}

function getRuntimeConfig(): SpeyposRuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  const runtimeConfig: SpeyposRuntimeConfig = window.__SPEYPOS_RUNTIME__ ?? {};
  const searchParams = new URLSearchParams(window.location.search);

  return {
    ...runtimeConfig,
    backendUrl: runtimeConfig.backendUrl || searchParams.get('backendUrl') || undefined,
    apiBaseUrl: runtimeConfig.apiBaseUrl || searchParams.get('apiBaseUrl') || undefined,
    appBaseUrl: runtimeConfig.appBaseUrl || searchParams.get('appBaseUrl') || undefined,
    apiProvider:
      runtimeConfig.apiProvider ||
      (searchParams.get('apiProvider') === 'native' ? 'native' : undefined),
    disableServiceWorker:
      runtimeConfig.disableServiceWorker ||
      searchParams.get('disableServiceWorker') === '1' ||
      searchParams.get('disableServiceWorker') === 'true' ||
      undefined,
  };
}

export function isAndroidWebViewBuild(): boolean {
  return import.meta.env.VITE_ANDROID_WEBVIEW === '1' || import.meta.env.VITE_ANDROID_WEBVIEW === 'true';
}

export function getBackendUrl(): string {
  const runtimeConfig = getRuntimeConfig();
  const configuredBackendUrl = runtimeConfig.backendUrl || import.meta.env.VITE_BACKEND_URL;

  if (configuredBackendUrl) {
    return trimTrailingSlashes(configuredBackendUrl);
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin !== 'file://') {
      return trimTrailingSlashes(origin);
    }
  }

  return isAndroidWebViewBuild() ? 'http://127.0.0.1:8080' : 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  const runtimeConfig = getRuntimeConfig();
  const configuredApiBaseUrl = runtimeConfig.apiBaseUrl || import.meta.env.VITE_API_BASE_URL;

  if (configuredApiBaseUrl) {
    return trimTrailingSlashes(configuredApiBaseUrl);
  }

  return `${getBackendUrl()}/api`;
}

export function getRuntimeApiProvider(): RuntimeApiProvider {
  const runtimeConfig = getRuntimeConfig();
  return runtimeConfig.apiProvider === 'native' ? 'native' : 'http';
}