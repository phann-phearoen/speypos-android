import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Printer, MessageSquare, AlertTriangle, RefreshCw, Cloud, Activity, Trash2, Play, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NumericInput } from '@/components/ui/NumericInput';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { healthApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
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
  { code: 'VOID', labelKey: 'admin.settings.receiptVoid' },
];

// Default receipt copies configuration
const DEFAULT_RECEIPT_COPIES: ReceiptCopyConfig[] = [
  { variant: 'INTERNAL', count: 1 },
  { variant: 'VOID', count: 1 }
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
  const { setIsRebooting, needsRestart, setNeedsRestart } = useSetup();
  const [loading, setLoading] = useState(true);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingCloudSync, setSavingCloudSync] = useState(false);
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const [receiptCopies, setReceiptCopies] = useState<ReceiptCopyConfig[]>(DEFAULT_RECEIPT_COPIES);

  // Cloud Sync state
  const [cloudSync, setCloudSync] = useState({
    enabled: false,
    api_key: '',
    base_url: '',
    mini_batch_size: 20
  });
  const [cloudSyncErrors, setCloudSyncErrors] = useState<Record<string, string>>({});

  // Printer LAN state
  const [printerLan, setPrinterLan] = useState({ enabled: false, host: '', port: 9100 });

  // Telegram intents state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramIntents, setTelegramIntents] = useState<TelegramIntent[]>([]);
  const [originalIntents, setOriginalIntents] = useState<TelegramIntent[]>([]);
  const [intentErrors, setIntentErrors] = useState<Record<string, string>>({});

  // Diagnostics state
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [deadLetterDetails, setDeadLetterDetails] = useState<DeadLetterDetails | null>(null);
  const [isShowingDeadLetters, setIsShowingDeadLetters] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isExportingLogs, setIsExportingLogs] = useState(false);

  // Software Update state
  const [updateSource, setUpdateSource] = useState({ base_url: '', api_key: '', last_check_at: null as number | null });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMetadata, setUpdateMetadata] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    loadSettings();
    refreshRuntimeStatus();
    loadUpdateSettings();
  }, []);

  const loadUpdateSettings = async () => {
    if (systemCompatibility.provider !== 'native') return;
    try {
      const { data } = await callNativeBridge<any>('getUpdateSettings');
      if (data) setUpdateSource(data);

      const meta = await callNativeBridge<any>('getUpdateMetadata');
      if (meta.data) setUpdateMetadata(meta.data);
    } catch (err) {
      console.error('Failed to load update settings:', err);
    }
  };

  const saveUpdateSettings = async () => {
    setSavingUpdate(true);
    try {
      const { error } = await callNativeBridge<any>('updateUpdateSettings', JSON.stringify(updateSource));
      if (error) {
        toast({ title: t('toast.error'), description: error, variant: 'destructive' });
      } else {
        toast({ title: t('admin.settings.saved'), description: 'Update configuration saved' });
      }
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      await callNativeBridge<any>('checkForUpdates');
      // Polling for metadata update after trigger
      let attempts = 0;
      const poll = setInterval(async () => {
        const response = await callNativeBridge<any>('getUpdateMetadata');
        const { data, isChecking } = response;

        // If data is found, OR if checking has finished and data is null
        if (data || (!isChecking && attempts > 1)) {
          setUpdateMetadata(data);
          clearInterval(poll);
          setIsCheckingUpdate(false);
          if (data) {
             toast({ title: 'Update Check', description: `Version ${data.versionName} available` });
          } else if (!isChecking) {
             toast({ title: 'Update Check', description: 'System is up to date' });
          }
        }
        attempts++;
        if (attempts > 30) { // Timeout after 30 seconds
          clearInterval(poll);
          setIsCheckingUpdate(false);
        }
      }, 1000);
    } catch (err) {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateMetadata?.url) return;
    setIsInstalling(true);
    try {
      await callNativeBridge<any>('performUpdate', updateMetadata.url);
      toast({ title: 'Downloading', description: 'Update installation started' });
    } finally {
      setIsInstalling(false);
    }
  };

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

  const handleExportLogs = async () => {
    setIsExportingLogs(true);
    try {
      const { data, error } = await systemCompatibility.exportLogs();
      if (error) {
        toast({ title: t('toast.error'), description: error, variant: 'destructive' });
      } else if (data?.success) {
        toast({ title: t('toast.success'), description: t('admin.settings.migrationExportSuccess') });
      }
    } catch (err) {
      toast({ title: t('toast.error'), description: 'Failed to export logs', variant: 'destructive' });
    } finally {
      setIsExportingLogs(false);
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

        const tokenSetting = data.find((s: Setting) => s.key === 'telegram.token');
        if (tokenSetting?.value) {
          setTelegramToken(tokenSetting.value);
        }

        // Load cloud sync settings
        const cloudSyncSetting = data.find((s: Setting) => s.key === 'cloud.sync');
        if (cloudSyncSetting?.value?.version === 1) {
          setCloudSync({
            enabled: cloudSyncSetting.value.enabled ?? false,
            api_key: cloudSyncSetting.value.api_key ?? '',
            base_url: cloudSyncSetting.value.base_url ?? '',
            mini_batch_size: cloudSyncSetting.value.mini_batch_size ?? 20,
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
      await settingsCompatibility.upsertSetting('telegram.token', {
        value: telegramToken,
        value_type: 'string',
        category: 'Integrations',
        description: 'Telegram Bot API Token',
      });

      const { error } = await settingsCompatibility.upsertSetting('telegram.intents', {
        value: { version: 1, intents: telegramIntents },
        value_type: 'json',
        category: 'Integrations',
        description: 'Configuration for Telegram reporting intents.',
      });
      if (!error) {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.telegramUpdated') });
        setNeedsRestart(true);
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
      // Perform handshake if enabling or if config changed
      if (cloudSync.enabled && settingsCompatibility.provider === 'native') {
        const handshake = await callNativeBridge<any>('performCloudHandshake', JSON.stringify({
          version: 1,
          ...cloudSync
        }));
        if (handshake.error) {
          toast({ title: t('toast.error'), description: `Cloud Handshake failed: ${handshake.error}`, variant: 'destructive' });
          setSavingCloudSync(false);
          return;
        }

        // Update local state with resolved store_id and metadata before saving
        if (handshake.data) {
          setCloudSync(prev => ({
            ...prev,
            ...handshake.data
          }));

          // Use the refreshed data for the subsequent upsert
          const { error } = await settingsCompatibility.upsertSetting('cloud.sync', {
            value: { version: 1, ...handshake.data },
            value_type: 'json',
            category: 'Integrations',
            description: 'Cloud sync configuration',
          });
          if (!error) {
            await refetchSettings();
            toast({ title: t('admin.settings.saved'), description: t('admin.settings.cloudSyncUpdated') });
            setNeedsRestart(true);
          }
          setSavingCloudSync(false);
          return;
        }
      }

      const { error } = await settingsCompatibility.upsertSetting('cloud.sync', {
        value: { version: 1, ...cloudSync },
        value_type: 'json',
        category: 'Integrations',
        description: 'Cloud sync configuration',
      });
      if (!error) {
        await refetchSettings();
        toast({ title: t('admin.settings.saved'), description: t('admin.settings.cloudSyncUpdated') });
        setNeedsRestart(true);
      }
    } catch (err) {
      toast({ title: t('toast.error'), description: 'Failed to save cloud settings', variant: 'destructive' });
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
        setNeedsRestart(true);
      }
    } finally {
      setSavingPrinter(false);
    }
  };

  const handleReboot = useCallback(async () => {
    setIsRebooting(true);
    try { await systemCompatibility.reboot(); } catch {}
    const poll = async () => {
      try {
        const response = await healthApi.check();
        if (response.data) {
          setNeedsRestart(false);
          setIsRebooting(false);
          window.location.reload();
          return;
        }
      } catch {}
      setTimeout(poll, 500);
    };
    setTimeout(poll, 500);
  }, [setIsRebooting, setNeedsRestart]);

  const updateReceiptCopyCount = (variant: string, count: number) => {
    const validCount = Math.max(0, Math.floor(count));
    setReceiptCopies(prev => prev.map(r => r.variant === variant ? { ...r, count: validCount } : r));
  };

  const handleExport = async (mode: 'menu' | 'full') => {
    console.log(`[SettingsManagement] Starting export for mode: ${mode}`);
    setIsExporting(mode);
    try {
      const { data, error } = await systemCompatibility.exportData(mode);
      if (error) {
        console.error(`[SettingsManagement] Export bridge error: ${error}`);
        toast({ title: t('toast.error'), description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        console.log(`[SettingsManagement] Received data from bridge. Size: ${JSON.stringify(data).length} chars`);
        const jsonString = JSON.stringify(data, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `speypos_${mode}_backup_${timestamp}.json`;

        if (systemCompatibility.provider === 'native') {
          console.log(`[SettingsManagement] Using native download for: ${filename}`);
          const downloadResult = await systemCompatibility.downloadFile(jsonString, filename);
          if (downloadResult.error) {
            console.error(`[SettingsManagement] Native download failed: ${downloadResult.error}`);
            toast({ title: t('toast.error'), description: downloadResult.error, variant: 'destructive' });
          } else {
            console.log(`[SettingsManagement] Native download successful`);
            toast({ title: t('toast.success'), description: t('admin.settings.migrationExportSuccess') });
          }
        } else {
          console.log(`[SettingsManagement] Using browser download for: ${filename}`);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`[SettingsManagement] Export cleanup completed`);
          }, 100);

          toast({ title: t('toast.success'), description: t('admin.settings.migrationExportSuccess') });
        }
      } else {
        console.warn(`[SettingsManagement] Export returned no data`);
      }
    } catch (err) {
      console.error(`[SettingsManagement] Export exception:`, err);
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const onImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
      setShowImportConfirm(true);
    }
    // Reset input so the same file can be picked again
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;

    setIsImporting(true);
    setShowImportConfirm(false);

    try {
      const text = await pendingImportFile.text();
      const payload = JSON.parse(text);

      const { error } = await systemCompatibility.importData(payload);
      if (error) {
        toast({ title: t('toast.error'), description: error, variant: 'destructive' });
        return;
      }

      toast({ title: t('toast.success'), description: t('admin.settings.migrationImportSuccess') });
      setTimeout(handleReboot, 2000);
    } catch (err) {
      toast({ title: t('toast.error'), description: 'Invalid JSON file', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
    }
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Mini Batch Size</Label>
                  <NumericInput
                    min={1}
                    max={200}
                    value={cloudSync.mini_batch_size}
                    onChange={(val) => setCloudSync(prev => ({ ...prev, mini_batch_size: val }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Background sync will trigger once this number of orders is reached.</p>
                </div>
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
                  <CardTitle className="text-lg">{t('admin.settings.printer')}</CardTitle>
                  <CardDescription>{t('admin.settings.printerDesc')}</CardDescription>
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
              <Label className="text-sm font-medium">{t('admin.settings.printerEnabled')}</Label>
              <Switch checked={printerLan.enabled} onCheckedChange={(checked) => setPrinterLan(prev => ({ ...prev, enabled: checked }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.settings.printerHost')}</Label>
                <Input value={printerLan.host} onChange={(e) => setPrinterLan(prev => ({ ...prev, host: e.target.value }))} placeholder="e.g. 192.168.1.100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.settings.printerPort')}</Label>
                <NumericInput
                  value={printerLan.port}
                  onChange={(val) => setPrinterLan(prev => ({ ...prev, port: val }))}
                  placeholder="9100"
                />
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
            <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
              <Label className="text-sm font-medium">Bot Token</Label>
              <Input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="Enter Telegram Bot Token"
              />
            </div>
            {telegramIntents.map(intent => (
              <div key={intent.intent} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t(INTENT_LABELS[intent.intent] || intent.intent)}</Label>
                  <Switch checked={intent.enabled} onCheckedChange={(checked) => updateIntentEnabled(intent.intent, checked)} />
                </div>
                <Input value={intent.chat_id || ''} onChange={(e) => updateIntentChatId(intent.intent, e.target.value)} disabled={!intent.enabled} placeholder="Chat ID" />
              </div>
            ))}
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
                <NumericInput
                  min={0}
                  value={receiptCopies.find(r => r.variant === variant.code)?.count ?? 0}
                  onChange={(val) => updateReceiptCopyCount(variant.code, val)}
                  className="w-20"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Migration */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('admin.settings.migration')}</CardTitle>
                <CardDescription>{t('admin.settings.migrationDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2"
                onClick={() => handleExport('menu')}
                disabled={!!isExporting}
              >
                {isExporting === 'menu' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <div className="text-xs font-semibold">{t('admin.settings.migrationMenu')}</div>
                <div className="text-[10px] text-muted-foreground font-normal">{t('admin.settings.migrationMenuDesc')}</div>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2"
                onClick={() => handleExport('full')}
                disabled={!!isExporting}
              >
                {isExporting === 'full' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-orange-500" />}
                <div className="text-xs font-semibold">{t('admin.settings.migrationFull')}</div>
                <div className="text-[10px] text-muted-foreground font-normal">{t('admin.settings.migrationFullDesc')}</div>
              </Button>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={onImportFileChange}
                disabled={isImporting}
              />
              <Button variant="secondary" className="w-full gap-2" disabled={isImporting}>
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t('admin.settings.migrationRestore')}
              </Button>
            </div>
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
                    <CardTitle className="text-lg">{t('admin.settings.diagnostics')}</CardTitle>
                    <CardDescription>{t('admin.settings.diagnosticsDesc')}</CardDescription>
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
                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">{t('admin.settings.diagnosticsPrintQueue')}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>{t('admin.settings.diagnosticsPending')}</span><span>{(runtimeStatus.printQueue?.pending_jobs || 0) + (runtimeStatus.printQueue?.retrying_jobs || 0)}</span></div>
                        <div className="flex justify-between"><span>{t('admin.settings.diagnosticsDeadLetter')}</span><span className="text-destructive font-bold">{runtimeStatus.printQueue?.dead_letter_jobs || 0}</span></div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">{t('admin.settings.diagnosticsActions')}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span>{t('admin.settings.diagnosticsPending')}</span><span>{(runtimeStatus.pendingActions?.pending_actions || 0) + (runtimeStatus.pendingActions?.retrying_actions || 0)}</span></div>
                        <div className="flex justify-between"><span>{t('admin.settings.diagnosticsDeadLetter')}</span><span className="text-destructive font-bold">{runtimeStatus.pendingActions?.dead_letter_actions || 0}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={showDeadLetters} variant="outline" size="sm" className="flex-1 gap-2"><AlertTriangle className="w-4 h-4 text-warning" />{t('admin.settings.diagnosticsDetails')}</Button>
                    <Button onClick={purgeDeadLetters} variant="outline" size="sm" className="flex-1 gap-2 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />{t('admin.settings.diagnosticsPurge')}</Button>
                  </div>
                  <Button
                    onClick={handleExportLogs}
                    disabled={isExportingLogs}
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                  >
                    {isExportingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {t('admin.settings.diagnosticsExportLogs')}
                  </Button>
                  <div className="text-[10px] text-muted-foreground text-center">{t('admin.settings.diagnosticsLastUpdated').replace('{{time}}', runtimeStatus.updatedAt)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Software Update */}
        {systemCompatibility.provider === 'native' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Download className="w-5 h-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg">Software Update</CardTitle>
                    <CardDescription>Configure update source and check for new versions</CardDescription>
                  </div>
                </div>
                <Button onClick={saveUpdateSettings} disabled={savingUpdate} size="sm" className="gap-2">
                  {savingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('admin.settings.save')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Update Gatekeeper URL (Lambda)</Label>
                  <Input value={updateSource.base_url} onChange={(e) => setUpdateSource(prev => ({ ...prev, base_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Update Secret Key</Label>
                  <Input type="password" value={updateSource.api_key} onChange={(e) => setUpdateSource(prev => ({ ...prev, api_key: e.target.value }))} placeholder="Secret header value" />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button variant="outline" onClick={handleCheckUpdate} disabled={isCheckingUpdate} className="w-full gap-2">
                  {isCheckingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Check for Updates
                </Button>

                {updateMetadata && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-semibold text-primary">Update Available: v{updateMetadata.versionName}</p>
                        <p className="text-xs text-muted-foreground">Build {updateMetadata.versionCode}</p>
                      </div>
                      <Button onClick={handleInstallUpdate} disabled={isInstalling} size="sm" className="gap-2">
                        {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Install Now
                      </Button>
                    </div>
                  </div>
                )}

                {updateSource.last_check_at && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Last checked: {new Date(updateSource.last_check_at).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Control */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">System Control</CardTitle>
                <CardDescription>Manage application lifecycle and manual restarts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Restart Application</p>
                <p className="text-xs text-muted-foreground">Reload the POS shell to apply all pending changes.</p>
              </div>
              <Button
                onClick={handleReboot}
                variant="destructive"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('admin.settings.reload')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isShowingDeadLetters} onOpenChange={setIsShowingDeadLetters}>
        <DialogContent className="admin-crud-dialog sm:max-w-2xl">
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <h2 className="text-lg font-semibold">{t('admin.settings.diagnosticsDeadLetterDetails')}</h2>
            <div className="admin-crud-dialog-body mt-4 space-y-4">
              {deadLetterDetails?.print_jobs.map((job: any) => (
                <div key={job.id} className="p-3 border rounded text-xs">
                  <div className="font-bold">{t('admin.settings.diagnosticsPrintQueue')}: {job.order_id}</div>
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
              <Button onClick={() => setIsShowingDeadLetters(false)} variant="outline">{t('common.cancel')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent className="sm:max-w-md">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{t('admin.settings.migrationDestructive')}</h3>
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('admin.settings.migrationDestructiveDesc') }} />
              <p className="text-xs font-medium text-destructive">
                {t('admin.settings.migrationDestructiveWarning')}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowImportConfirm(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmImport}>{t('admin.settings.migrationConfirmRestore')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
