import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { settingsApi, storeApi, resolveImageUrl } from '@/lib/api';
import type { Setting, Store } from '@/types/pos';

interface SettingsContextValue {
  settings: Map<string, any>;
  store: Store | null;
  isLoading: boolean;
  getSetting: (key: string) => any;
  getLanguage: () => string;
  getCurrency: () => string;
  getTimezone: () => string;
  getStoreName: () => string;
  getBrandName: () => string;
  getBrandLogo: () => string | null;
  hasCustomBranding: () => boolean;
  getPaymentQrConfig: () => { enabled: boolean; imageUrl: string | null };
  getCloudSyncEnabled: () => boolean;
  refetchSettings: () => Promise<void>;
  refetchStore: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Map<string, any>>(new Map());
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await settingsApi.getAll();
      if (error) {
        console.error('Failed to load settings:', error);
        return;
      }
      
      if (data) {
        const settingsMap = new Map<string, any>();
        data.forEach((setting: Setting) => {
          settingsMap.set(setting.key, setting.value);
        });
        setSettings(settingsMap);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }, []);

  const fetchStore = useCallback(async () => {
    try {
      const { data, error } = await storeApi.get();
      if (error) {
        console.error('Failed to load store:', error);
        return;
      }
      
      if (data) {
        setStore(data);
      }
    } catch (err) {
      console.error('Error loading store:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchSettings(), fetchStore()]);
      setIsLoading(false);
    };
    loadAll();
  }, [fetchSettings, fetchStore]);

  const getSetting = useCallback((key: string) => {
    return settings.get(key);
  }, [settings]);

  // Language and currency now come from Store, not Settings
  const getLanguage = useCallback(() => {
    return store?.language || 'en';
  }, [store]);

  const getCurrency = useCallback(() => {
    return store?.currency || 'USD';
  }, [store]);

  const getTimezone = useCallback(() => {
    return store?.timezone || 'UTC';
  }, [store]);

  const getStoreName = useCallback(() => {
    return store?.name || 'SpeyPOS';
  }, [store]);

  // Brand helpers for hierarchical branding
  const getBrandName = useCallback(() => {
    return store?.brand_name || store?.name || 'SpeyPOS';
  }, [store]);

  const getBrandLogo = useCallback(() => {
    return resolveImageUrl(store?.logo_url) || null;
  }, [store]);

  const hasCustomBranding = useCallback(() => {
    return !!(store?.logo_url || store?.brand_name);
  }, [store]);

  const getCloudSyncEnabled = useCallback(() => {
    const raw = settings.get('cloud.sync');
    if (raw?.version === 1 && raw.enabled === true) return true;
    return false;
  }, [settings]);

  const getPaymentQrConfig = useCallback(() => {
    const profile = store?.payment_profile;
    if (profile?.version === 1 && profile.qr) {
      return {
        enabled: profile.qr.enabled === true && !!profile.qr.image_url,
        imageUrl: resolveImageUrl(profile.qr.image_url) || null,
      };
    }
    return { enabled: false, imageUrl: null };
  }, [store]);

  const refetchSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const refetchStore = useCallback(async () => {
    await fetchStore();
  }, [fetchStore]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        store,
        isLoading,
        getSetting,
        getLanguage,
        getCurrency,
        getTimezone,
        getStoreName,
        getBrandName,
        getBrandLogo,
        hasCustomBranding,
        getPaymentQrConfig,
        getCloudSyncEnabled,
        refetchSettings,
        refetchStore,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
