function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export interface SpeyposRuntimeConfig {
  backendUrl?: string;
  apiBaseUrl?: string;
  appBaseUrl?: string;
  disableServiceWorker?: boolean;
}

declare global {
  interface Window {
    __SPEYPOS_RUNTIME__?: SpeyposRuntimeConfig;
  }
}

function getRuntimeConfig(): SpeyposRuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__SPEYPOS_RUNTIME__ ?? {};
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