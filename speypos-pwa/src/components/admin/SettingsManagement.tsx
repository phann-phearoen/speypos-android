import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Printer, MessageSquare, AlertTriangle, RefreshCw, Cloud, Activity, Trash2, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { healthApi } from '@/lib/api';
import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';
import { getSettingsCompatibilityProvider } from '@/lib/compatibility/settings';
import { useSettings } from '@/contexts/SettingsContext';
import { useSetup } from '@/contexts/SetupContext';
import { useTranslation } from '@/lib/i18n';
import type { Setting, ReceiptCopyConfig, TelegramIntent, ReceiptCopiesSettingV1, TelegramIntentsSettingV1, CloudSyncSettingV1, RuntimeStatus, DeadLetterDetails } from '@/types/pos';

const systemCompatibility = getSystemCompatibilityProvider();
const settingsCompatibility = getSettingsCompatibilityProvider();

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
  const [savingPrinter, setSavingPrinter] = useState(false);

  const [receiptCopies, setReceiptCopies] = useState<ReceiptCopyConfig[]>(DEFAULT_RECEIPT_COPIES);

  // Cloud Sync state
  const [cloudSync, setCloudSync] = useState({ enabled: false, api_key: '', base_url: '' });
  const [cloudSyncErrors, setCloudSyncErrors] = useState<Record<string, string>>({});

  // Printer LAN state
  const [printerLan, setPrinterLan] = useState({ enabled: false, host: '', port: 9100 });

  // Telegram intents state
  const [telegramIntents, setTelegramIntents] = useState<TelegramIntent[]>([]);
  const [originalIntents, setOriginalIntents] = useState<TelegramIntent[]>([]);
  const [intentErrors, setIntentErrors] = useState<Record<string, string>>({});
  const [needsReboot, setNeedsReboot] = useState(false);
  const [rebootStatus, setRebootStatus] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'error'>('idle');

  // Diagnostics state
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [deadLetterDetails, setDeadLetterDetails] = useState<DeadLetterDetails | null>(null);
  const [isShowingDeadLetters, setIsShowingDeadLetters] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    loadSettings();
    refreshRuntimeStatus();
  }, []);

  const refreshRuntimeStatus = async () => {
    if (systemCompatibility.provider !== 'native') return;
    setIsRefreshingStatus(true);
    try {
      const { data } = await systemCompatibility.getRuntimeStatus();
      if (data) setRuntimeStatus(data);
    } catch (err) {
      console.error('Failed to refresh runtime status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const showDeadLetters = async () => {
    try {
      const { data } = await systemCompatibility.getDeadLetterDetails();
      if (data) {
        setDeadLetterDetails(data);
        setIsShowingDeadLetters(true);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load dead letter details', variant: 'destructive' });
    }
  };

  const purgeDeadLetters = async () => {
    setIsPurging(true);
    try {
      await systemCompatibility.purgeDeadLetters();
      toast({ title: 'Success', description: 'Dead letters purged' });
      await refreshRuntimeStatus();
      setIsShowingDeadLetters(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to purge dead letters', variant: 'destructive' });
    } finally {
      setIsPurging(false);
    }
  };

  const retryAction = async (actionId: string) => {
    try {
      await systemCompatibility.forceRetryAction(actionId);
      toast({ title: 'Success', description: 'Action retry triggered' });
      await showDeadLetters(); // Refresh dialog
      await refreshRuntimeStatus();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to retry action', variant: 'destructive' });
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await settingsCompatibility.getAllSettings();
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

        // Load printer settings
        const printerSetting = data.find((s: Setting) => s.key === 'printer.lan');
        if (printerSetting?.value) {
          setPrinterLan({
            enabled: printerSetting.value.enabled ?? false,
            host: printerSetting.value.host ?? '',
            port: printerSetting.value.port ?? 9100,
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
      const { error } = await settingsCompatibility.upsertSetting('receipt.copies', {
        value: versionedPayload,
        value_type: 'json',
        category: 'receipt',
        description: 'Receipt printing configuration',
      });
      
      if (error) {
        toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
      } else {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.receiptUpdated') });
      }
    } catch (err) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setSavingReceipt(false);
    }
  };

  const validateAllIntents = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;
    telegramIntents.forEach(intent => {
      if (intent.enabled && (!intent.chat_id || intent.chat_id.trim() === '')) {
        errors[intent.intent] = t('admin.settings.chatIdRequired');
        isValid = false;
      }
    });
    setIntentErrors(errors);
    return isValid;
  };

  const updateIntentEnabled = (intentKey: string, enabled: boolean) => {
    setTelegramIntents(prev => prev.map(i => i.intent === intentKey ? { ...i, enabled } : i));
  };

  const updateIntentChatId = (intentKey: string, chat_id: string) => {
    setTelegramIntents(prev => prev.map(i => i.intent === intentKey ? { ...i, chat_id } : i));
  };

  const saveTelegramSettings = async () => {
    if (!validateAllIntents()) return;
    setSavingTelegram(true);
    try {
      const { error } = await settingsCompatibility.upsertSetting('telegram.intents', {
        value: { version: 1, intents: telegramIntents },
        value_type: 'json',
        category: 'Integrations',
        description: 'Configuration for Telegram reporting intents.',
      });
      if (!error) {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.telegramUpdated') });
        setNeedsReboot(true);
      }
    } catch (err) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setSavingTelegram(false);
    }
  };

  const saveCloudSyncSettings = async () => {
    if (cloudSync.enabled) {
      if (!cloudSync.api_key.trim() || !cloudSync.base_url.trim()) return;
    }
    setSavingCloudSync(true);
    try {
      const { error } = await settingsCompatibility.upsertSetting('cloud.sync', {
        value: { version: 1, ...cloudSync },
        value_type: 'json',
        category: 'Integrations',
        description: 'Cloud sync configuration',
      });
      if (!error) {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.cloudSyncUpdated') });
        setNeedsReboot(true);
      }
    } finally {
      setSavingCloudSync(false);
    }
  };

  const savePrinterSettings = async () => {
    setSavingPrinter(true);
    try {
      const { error } = await settingsCompatibility.upsertSetting('printer.lan', {
        value: {
          version: 1,
          connection_method: 'lan',
          protocol: 'raw9100',
          timeout_ms: 5000,
          profile: 'default',
          ...printerLan
        },
        value_type: 'json',
        category: 'Printing',
        description: 'Network printer configuration',
      });

      if (error) {
        toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
      } else {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: 'Printer settings updated' });
      }
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleReboot = useCallback(async () => {
    setIsRebooting(true);
    setRebootStatus('sending');
    try { await systemCompatibility.reboot(); } catch {}
    setRebootStatus('waiting');
    const poll = async () => {
      try {
        const response = await healthApi.check();
        if (response.data) {
          setRebootStatus('success');
          setIsRebooting(false);
          window.location.reload();
          return;
        }
      } catch {}
      setTimeout(poll, 500);
    };
    setTimeout(poll, 500);
  }, [setIsRebooting]);

  const updateReceiptCopyCount = (variant: string, count: number) => {
    const validCount = Math.max(0, Math.floor(count));
    setReceiptCopies(prev => prev.map(r => r.variant === variant ? { ...r, count: validCount } : r));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
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
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Cloud className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.cloudSync')}</CardTitle>
                  <CardDescription>{t('admin.settings.cloudSyncDesc')}</CardDescription>
                </div>
              </div>
              <Button onClick={saveCloudSyncSettings} disabled={savingCloudSync} size="sm" className="gap-2">
                {savingCloudSync ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">{t('admin.settings.cloudSyncEnabled')}</Label>
              <Switch checked={cloudSync.enabled} onCheckedChange={(checked) => setCloudSync(prev => ({ ...prev, enabled: checked }))} />
            </div>
            {cloudSync.enabled && (
              <div className="space-y-3">
                <Input value={cloudSync.base_url} onChange={(e) => setCloudSync(prev => ({ ...prev, base_url: e.target.value }))} placeholder="Base URL" />
                <Input type="password" value={cloudSync.api_key} onChange={(e) => setCloudSync(prev => ({ ...prev, api_key: e.target.value }))} placeholder="API Key" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Printer Configuration */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Network Printer</CardTitle>
                  <CardDescription>Configure RAW TCP printer (LAN/WiFi)</CardDescription>
                </div>
              </div>
              <Button onClick={savePrinterSettings} disabled={savingPrinter} size="sm" className="gap-2">
                {savingPrinter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Enable Printer</Label>
              <Switch checked={printerLan.enabled} onCheckedChange={(checked) => setPrinterLan(prev => ({ ...prev, enabled: checked }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Printer IP Address</Label>
                <Input value={printerLan.host} onChange={(e) => setPrinterLan(prev => ({ ...prev, host: e.target.value }))} placeholder="e.g. 192.168.1.100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Port</Label>
                <Input type="number" value={printerLan.port} onChange={(e) => setPrinterLan(prev => ({ ...prev, port: parseInt(e.target.value) || 9100 }))} placeholder="9100" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Reporting */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.telegramReporting')}</CardTitle>
                  <CardDescription>{t('admin.settings.telegramReportingDesc')}</CardDescription>
                </div>
              </div>
              <Button onClick={saveTelegramSettings} disabled={savingTelegram} size="sm" className="gap-2">
                {savingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {telegramIntents.map(intent => (
              <div key={intent.intent} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t(INTENT_LABELS[intent.intent] || intent.intent)}</Label>
                  <Switch checked={intent.enabled} onCheckedChange={(checked) => updateIntentEnabled(intent.intent, checked)} />
                </div>
                <Input value={intent.chat_id || ''} onChange={(e) => updateIntentChatId(intent.intent, e.target.value)} disabled={!intent.enabled} placeholder="Chat ID" />
              </div>
            ))}
            {needsReboot && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/50 rounded-lg flex items-center justify-between gap-3">
                <span className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />{t('admin.settings.rebootRequired')}</span>
                <Button onClick={handleReboot} variant="outline" size="sm" disabled={rebootStatus === 'waiting' || rebootStatus === 'sending'}>{t('admin.settings.reload')}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Printing */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Printer className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">{t('admin.settings.receipt')}</CardTitle>
                  <CardDescription>{t('admin.settings.receiptDesc')}</CardDescription>
                </div>
              </div>
              <Button onClick={saveReceiptSettings} disabled={savingReceipt} size="sm" className="gap-2">
                {savingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {RECEIPT_VARIANTS.map((variant) => (
              <div key={variant.code} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">{t(variant.labelKey)}</Label>
                <Input type="number" min="0" value={receiptCopies.find(r => r.variant === variant.code)?.count ?? 0} onChange={(e) => updateReceiptCopyCount(variant.code, parseInt(e.target.value) || 0)} className="w-20" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Diagnostics */}
        {systemCompatibility.provider === 'native' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Activity className="w-5 h-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg">System Diagnostics</CardTitle>
                    <CardDescription>Native background tasks and health status</CardDescription>
                  </div>
                </div>
                <Button onClick={refreshRuntimeStatus} disabled={isRefreshingStatus} size="sm" variant="ghost">
                  <RefreshCw className={`w-4 h-4 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {runtimeStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">Print Queue</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>Pending</span><span>{(runtimeStatus.printQueue?.pending_jobs || 0) + (runtimeStatus.printQueue?.retrying_jobs || 0)}</span></div>
                        <div className="flex justify-between"><span>Dead Letter</span><span className="text-destructive font-bold">{runtimeStatus.printQueue?.dead_letter_jobs || 0}</span></div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">Actions</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>Pending</span><span>{(runtimeStatus.pendingActions?.pending_actions || 0) + (runtimeStatus.pendingActions?.retrying_actions || 0)}</span></div>
                        <div className="flex justify-between"><span>Dead Letter</span><span className="text-destructive font-bold">{runtimeStatus.pendingActions?.dead_letter_actions || 0}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={showDeadLetters} variant="outline" size="sm" className="flex-1 gap-2"><AlertTriangle className="w-4 h-4 text-warning" />Details</Button>
                    <Button onClick={purgeDeadLetters} variant="outline" size="sm" className="flex-1 gap-2 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Purge All</Button>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center">Last updated: {runtimeStatus.updatedAt}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isShowingDeadLetters} onOpenChange={setIsShowingDeadLetters}>
        <DialogContent className="admin-crud-dialog sm:max-w-2xl">
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <h2 className="text-lg font-semibold">Dead Letter Details</h2>
            <div className="admin-crud-dialog-body mt-4 space-y-4">
              {deadLetterDetails?.print_jobs.map((job: any) => (
                <div key={job.id} className="p-3 border rounded text-xs">
                  <div className="font-bold">Print Job: {job.order_id}</div>
                  <div className="text-destructive mt-1">{job.last_error}</div>
                </div>
              ))}
              {deadLetterDetails?.generic_actions.map((action: any) => (
                <div key={action.id} className="p-3 border rounded text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{action.type}</span>
                    <Button onClick={() => retryAction(action.id)} size="icon" variant="ghost" className="h-4 w-4"><Play className="h-2 w-2" /></Button>
                  </div>
                  <div className="text-destructive mt-1">{action.last_error}</div>
                </div>
              ))}
            </div>
            <div className="admin-crud-dialog-footer mt-6 flex justify-end gap-2">
              <Button onClick={() => setIsShowingDeadLetters(false)} variant="outline">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
