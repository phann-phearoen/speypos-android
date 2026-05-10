import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Printer, MessageSquare, AlertTriangle, RefreshCw, Cloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { settingsApi, systemApi, healthApi } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { useSetup } from '@/contexts/SetupContext';
import { useTranslation } from '@/lib/i18n';
import type { Setting, ReceiptCopyConfig, TelegramIntent, ReceiptCopiesSettingV1, TelegramIntentsSettingV1, CloudSyncSettingV1 } from '@/types/pos';

// Available receipt variants (extensible for future variants)
const RECEIPT_VARIANTS = [
  { code: 'INTERNAL', labelKey: 'admin.settings.receiptInternal' },
];

// Default receipt copies configuration
const DEFAULT_RECEIPT_COPIES: ReceiptCopyConfig[] = [
  { variant: 'INTERNAL', count: 1 }
];

// Intent display labels and descriptions
const INTENT_LABELS: Record<string, string> = {
  'ORDER_TRACKER': 'admin.settings.intentOrderTracker',
  'SHIFT_TRACKER': 'admin.settings.intentShiftTracker',
};

const INTENT_DESCRIPTIONS: Record<string, string> = {
  'ORDER_TRACKER': 'admin.settings.intentOrderTrackerDesc',
  'SHIFT_TRACKER': 'admin.settings.intentShiftTrackerDesc',
};

export function SettingsManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refetchSettings } = useSettings();
  const { setIsRebooting } = useSetup();
  const [loading, setLoading] = useState(true);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingCloudSync, setSavingCloudSync] = useState(false);
  
  const [receiptCopies, setReceiptCopies] = useState<ReceiptCopyConfig[]>(DEFAULT_RECEIPT_COPIES);

  // Cloud Sync state
  const [cloudSync, setCloudSync] = useState({ enabled: false, api_key: '', base_url: '' });
  const [cloudSyncErrors, setCloudSyncErrors] = useState<Record<string, string>>({});
  
  // Telegram intents state
  const [telegramIntents, setTelegramIntents] = useState<TelegramIntent[]>([]);
  const [originalIntents, setOriginalIntents] = useState<TelegramIntent[]>([]);
  const [intentErrors, setIntentErrors] = useState<Record<string, string>>({});
  const [needsReboot, setNeedsReboot] = useState(false);
  const [rebootStatus, setRebootStatus] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await settingsApi.getAll();
      if (error) {
        console.error('Failed to load settings:', error);
      } else if (data) {
        // Load receipt settings (versioned object)
        const receiptSetting = data.find((s: Setting) => s.key === 'receipt.copies');
        if (receiptSetting?.value?.version === 1 && Array.isArray(receiptSetting.value.copies)) {
          setReceiptCopies(receiptSetting.value.copies);
        } else {
          setReceiptCopies(DEFAULT_RECEIPT_COPIES);
        }
        
        // Load telegram intents (versioned object)
        const intentsSetting = data.find((s: Setting) => s.key === 'telegram.intents');
        console.log('Loaded telegram intents setting:', intentsSetting);
        if (intentsSetting?.value?.version === 1 && Array.isArray(intentsSetting.value.intents)) {
          setTelegramIntents(intentsSetting.value.intents);
          setOriginalIntents(intentsSetting.value.intents);
        }

        // Load cloud sync settings
        const cloudSyncSetting = data.find((s: Setting) => s.key === 'cloud.sync');
        if (cloudSyncSetting?.value?.version === 1) {
          setCloudSync({
            enabled: cloudSyncSetting.value.enabled ?? false,
            api_key: cloudSyncSetting.value.api_key ?? '',
            base_url: cloudSyncSetting.value.base_url ?? '',
          });
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveReceiptSettings = async () => {
    setSavingReceipt(true);
    try {
      const versionedPayload: ReceiptCopiesSettingV1 = {
        version: 1,
        copies: receiptCopies,
      };
      const { error } = await settingsApi.upsert('receipt.copies', {
        value: versionedPayload,
        value_type: 'json',
        category: 'receipt',
        description: 'Receipt printing configuration',
      });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchSettings();
        toast({
          title: t('admin.settings.saved'),
          description: t('admin.settings.receiptUpdated'),
        });
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('toast.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSavingReceipt(false);
    }
  };

  // Validation for telegram intents
  const validateIntent = (intent: TelegramIntent): string | null => {
    if (intent.enabled && (!intent.chat_id || intent.chat_id.trim() === '')) {
      return t('admin.settings.chatIdRequired');
    }
    return null;
  };

  const validateAllIntents = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    telegramIntents.forEach(intent => {
      const error = validateIntent(intent);
      if (error) {
        errors[intent.intent] = error;
        isValid = false;
      }
    });
    
    setIntentErrors(errors);
    return isValid;
  };

  const updateIntentEnabled = (intentKey: string, enabled: boolean) => {
    setTelegramIntents(prev => prev.map(i => 
      i.intent === intentKey ? { ...i, enabled } : i
    ));
    
    // Clear validation error when disabling
    if (!enabled) {
      setIntentErrors(prev => {
        const next = { ...prev };
        delete next[intentKey];
        return next;
      });
    }
  };

  const updateIntentChatId = (intentKey: string, chat_id: string) => {
    setTelegramIntents(prev => prev.map(i => 
      i.intent === intentKey ? { ...i, chat_id } : i
    ));
    
    // Clear validation error when typing
    if (intentErrors[intentKey]) {
      setIntentErrors(prev => {
        const next = { ...prev };
        delete next[intentKey];
        return next;
      });
    }
  };

  const saveTelegramSettings = async () => {
    if (!validateAllIntents()) return;
    
    setSavingTelegram(true);
    try {
      const versionedPayload: TelegramIntentsSettingV1 = {
        version: 1,
        intents: telegramIntents,
      };
      const { error } = await settingsApi.upsert('telegram.intents', {
        value: versionedPayload,
        value_type: 'json',
        category: 'Integrations',
        description: 'Configuration for Telegram reporting intents.',
      });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchSettings();
        toast({
          title: t('admin.settings.saved'),
          description: t('admin.settings.telegramUpdated'),
        });
        // Check if intents changed from original to show reboot banner
        const hasChanges = JSON.stringify(telegramIntents) !== JSON.stringify(originalIntents);
        if (hasChanges) {
          setNeedsReboot(true);
        }
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('toast.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSavingTelegram(false);
    }
  };

  // Cloud Sync save handler
  const saveCloudSyncSettings = async () => {
    // Validate when enabled
    if (cloudSync.enabled) {
      const errors: Record<string, string> = {};
      if (!cloudSync.api_key.trim()) errors.api_key = t('admin.settings.cloudSyncApiKeyRequired');
      if (!cloudSync.base_url.trim()) errors.base_url = t('admin.settings.cloudSyncBaseUrlRequired');
      if (Object.keys(errors).length > 0) {
        setCloudSyncErrors(errors);
        return;
      }
    }
    setCloudSyncErrors({});
    setSavingCloudSync(true);
    try {
      const versionedPayload: CloudSyncSettingV1 = {
        version: 1,
        enabled: cloudSync.enabled,
        api_key: cloudSync.api_key,
        base_url: cloudSync.base_url,
      };
      const { error } = await settingsApi.upsert('cloud.sync', {
        value: versionedPayload,
        value_type: 'json',
        category: 'Integrations',
        description: 'Cloud sync configuration',
      });

      if (error) {
        toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
      } else {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.cloudSyncUpdated') });
        setNeedsReboot(true);
      }
    } catch {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setSavingCloudSync(false);
    }
  };

  // Reboot handler
  const handleReboot = useCallback(async () => {
    setIsRebooting(true);
    setRebootStatus('sending');
    
    try {
      await systemApi.reboot();
    } catch {
      // Expected - server shutting down
    }
    
    setRebootStatus('waiting');
    
    // Poll for server recovery
    const pollInterval = 200;
    const maxAttempts = 300;
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      try {
        const response = await healthApi.check();
        if (response.data) {
          setRebootStatus('success');
          setNeedsReboot(false);
          setIsRebooting(false);
          toast({
            title: t('admin.store.restartSuccess'),
            description: t('admin.store.restartSuccessDesc'),
          });
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
      } catch {
        // Server still down
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        setRebootStatus('error');
        setIsRebooting(false);
        toast({
          title: t('admin.store.restartTimeout'),
          description: t('admin.store.restartTimeoutDesc'),
          variant: 'destructive',
        });
      }
    };
    
    setTimeout(poll, 500);
  }, [setIsRebooting, t, toast]);

  const updateReceiptCopyCount = (variant: string, count: number) => {
    const validCount = Math.max(0, Math.floor(count));
    
    setReceiptCopies(prev => {
      const existing = prev.find(r => r.variant === variant);
      if (existing) {
        return prev.map(r => 
          r.variant === variant ? { ...r, count: validCount } : r
        );
      }
      return [...prev, { variant, count: validCount }];
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.settings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.settings.description')}</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Cloud Sync */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.cloudSync')}</CardTitle>
                  <CardDescription>{t('admin.settings.cloudSyncDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveCloudSyncSettings} 
                disabled={savingCloudSync}
                size="sm"
                className="gap-2"
              >
                {savingCloudSync ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">{t('admin.settings.cloudSyncEnabled')}</Label>
              <Switch
                checked={cloudSync.enabled}
                onCheckedChange={(checked) => {
                  setCloudSync(prev => ({ ...prev, enabled: checked }));
                  if (!checked) setCloudSyncErrors({});
                }}
              />
            </div>
            
            {cloudSync.enabled && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('admin.settings.cloudSyncBaseUrl')}</Label>
                  <Input
                    value={cloudSync.base_url}
                    onChange={(e) => {
                      setCloudSync(prev => ({ ...prev, base_url: e.target.value }));
                      if (cloudSyncErrors.base_url) setCloudSyncErrors(prev => { const n = { ...prev }; delete n.base_url; return n; });
                    }}
                    placeholder="https://api.example.com"
                    className={cloudSyncErrors.base_url ? 'border-destructive' : ''}
                  />
                  {cloudSyncErrors.base_url && <p className="text-xs text-destructive">{cloudSyncErrors.base_url}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('admin.settings.cloudSyncApiKey')}</Label>
                  <Input
                    type="password"
                    value={cloudSync.api_key}
                    onChange={(e) => {
                      setCloudSync(prev => ({ ...prev, api_key: e.target.value }));
                      if (cloudSyncErrors.api_key) setCloudSyncErrors(prev => { const n = { ...prev }; delete n.api_key; return n; });
                    }}
                    placeholder="sk-..."
                    className={cloudSyncErrors.api_key ? 'border-destructive' : ''}
                  />
                  {cloudSyncErrors.api_key && <p className="text-xs text-destructive">{cloudSyncErrors.api_key}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telegram Reporting */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.telegramReporting')}</CardTitle>
                  <CardDescription>{t('admin.settings.telegramReportingDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveTelegramSettings} 
                disabled={savingTelegram}
                size="sm"
                className="gap-2"
              >
                {savingTelegram ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {telegramIntents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.settings.telegramNotConfigured')}
              </div>
            ) : (
              <div className="space-y-4">
                {telegramIntents.map(intent => (
                  <div 
                    key={intent.intent} 
                    className="p-4 border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {t(INTENT_LABELS[intent.intent] || intent.intent)}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t(INTENT_DESCRIPTIONS[intent.intent] || '')}
                        </p>
                      </div>
                      <Switch
                        checked={intent.enabled}
                        onCheckedChange={(checked) => updateIntentEnabled(intent.intent, checked)}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor={`chatId-${intent.intent}`} className="text-xs">
                        {t('admin.settings.chatId')}
                      </Label>
                      <Input
                        id={`chatId-${intent.intent}`}
                        value={intent.chat_id || ''}
                        onChange={(e) => updateIntentChatId(intent.intent, e.target.value)}
                        disabled={!intent.enabled}
                        placeholder="-1001234567890"
                        className={intentErrors[intent.intent] ? 'border-destructive' : ''}
                      />
                      {intentErrors[intent.intent] && (
                        <p className="text-xs text-destructive">
                          {intentErrors[intent.intent]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Reboot Banner */}
            {needsReboot && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/50 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <span>{t('admin.settings.rebootRequired')}</span>
                </div>
                <Button 
                  onClick={handleReboot} 
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  disabled={rebootStatus === 'waiting' || rebootStatus === 'sending'}
                >
                  {(rebootStatus === 'waiting' || rebootStatus === 'sending') && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {rebootStatus === 'idle' && <RefreshCw className="w-4 h-4" />}
                  {rebootStatus === 'waiting' 
                    ? t('admin.store.waitingReconnect')
                    : rebootStatus === 'sending'
                    ? t('admin.store.sendingRestart')
                    : t('admin.settings.reload')
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Printing Setting */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.receipt')}</CardTitle>
                  <CardDescription>{t('admin.settings.receiptDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveReceiptSettings} 
                disabled={savingReceipt}
                size="sm"
                className="gap-2"
              >
                {savingReceipt ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {RECEIPT_VARIANTS.map((variant) => {
              const config = receiptCopies.find(r => r.variant === variant.code);
              const count = config?.count ?? 0;
              
              return (
                <div key={variant.code} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      {t(variant.labelKey)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.settings.receiptCopies')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={count}
                      onChange={(e) => updateReceiptCopyCount(variant.code, parseInt(e.target.value) || 0)}
                      className="w-20 text-center"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}