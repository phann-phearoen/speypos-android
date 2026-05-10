import { useState, useEffect, useCallback } from 'react';
import { Loader2, Store, Globe, Palette, Save, RefreshCw, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { storeApi, systemApi, healthApi } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { useSetup } from '@/contexts/SetupContext';
import { useTranslation } from '@/lib/i18n';
import { ImageUpload } from './ImageUpload';
import type { Store as StoreType, PaymentProfileV1 } from '@/types/pos';

const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'km', name: 'Khmer (ភាសាខ្មែរ)' },
];

export function StoreManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { store: contextStore, refetchStore } = useSettings();
  const { setIsRebooting } = useSetup();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreType | null>(null);
  
  // Form state
  const [storeName, setStoreName] = useState('');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  
  // Saving state
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingLocalization, setSavingLocalization] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  
  // QR Payment state
  const [qrEnabled, setQrEnabled] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  
  // Reboot state
  type RebootStatus = 'idle' | 'sending' | 'waiting' | 'success' | 'error';
  const [needsReboot, setNeedsReboot] = useState(false);
  const [rebootStatus, setRebootStatus] = useState<RebootStatus>('idle');

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    setLoading(true);
    try {
      const { data, error } = await storeApi.get();
      if (error) {
        console.error('Failed to load store:', error);
      } else if (data) {
        setStore(data);
        setStoreName(data.name || '');
        setLanguage(data.language || 'en');
        setCurrency(data.currency || 'USD');
        setBrandName(data.brand_name || '');
        setLogoUrl(data.logo_url || '');
        setAddress(data.address || '');
        // Load QR payment settings
        if (data.payment_profile?.version === 1) {
          setQrEnabled(data.payment_profile.qr?.enabled || false);
          setQrImageUrl(data.payment_profile.qr?.image_url || '');
        }
      }
    } catch (err) {
      console.error('Error loading store:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveIdentity = async () => {
    setSavingIdentity(true);
    try {
      const { error } = await storeApi.update({ name: storeName });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchStore();
        toast({
          title: t('admin.store.saved'),
          description: t('admin.store.storeNameUpdated'),
        });
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('toast.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSavingIdentity(false);
    }
  };

  const saveLocalization = async () => {
    setSavingLocalization(true);
    try {
      const hasChanged = 
        language !== store?.language || 
        currency !== store?.currency;
      
      const { error } = await storeApi.update({ language, currency });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchStore();
        toast({
          title: t('admin.store.saved'),
          description: t('admin.store.localizationUpdated'),
        });
        
        // If language or currency changed, show reboot banner
        if (hasChanged) {
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
      setSavingLocalization(false);
    }
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    try {
      const { error } = await storeApi.update({ 
        brand_name: brandName || null, 
        logo_url: logoUrl || null,
        address: address || null,
      });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchStore();
        toast({
          title: t('admin.store.saved'),
          description: t('admin.store.brandingUpdated'),
        });
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('toast.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSavingBranding(false);
    }
  };

  const savePaymentSettings = async () => {
    setSavingPayment(true);
    try {
      const paymentProfile: PaymentProfileV1 = {
        version: 1,
        qr: {
          enabled: qrEnabled && !!qrImageUrl,
          image_url: qrImageUrl || null,
        },
      };
      
      const { error } = await storeApi.update({ payment_profile: paymentProfile });
      
      if (error) {
        toast({
          title: t('toast.error'),
          description: t('toast.failedToSave'),
          variant: 'destructive',
        });
      } else {
        await refetchStore();
        toast({
          title: t('admin.store.saved'),
          description: t('admin.store.paymentUpdated'),
        });
      }
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('toast.failedToSave'),
        variant: 'destructive',
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleQrImageChange = (url: string) => {
    setQrImageUrl(url);
    if (!url) {
      setQrEnabled(false);
    }
  };

  const handleReboot = useCallback(async () => {
    setIsRebooting(true); // Enable reboot mode app-wide
    setRebootStatus('sending');
    
    try {
      await systemApi.reboot();
    } catch (err) {
      // Expected - server may already be shutting down
    }
    
    setRebootStatus('waiting');
    
    // Poll for server recovery
    const pollInterval = 200; // ms
    const maxAttempts = 300; // 60 seconds max (300 * 200ms)
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      try {
        const response = await healthApi.check();
        if (response.data) {
          // Server is back!
          setRebootStatus('success');
          setNeedsReboot(false);
          toast({
            title: t('admin.store.restartSuccess'),
            description: t('admin.store.restartSuccessDesc'),
          });
          // setIsRebooting will be reset on reload
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
      } catch {
        // Expected during restart - server is still down
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        setRebootStatus('error');
        setIsRebooting(false); // Exit reboot mode on timeout
        toast({
          title: t('admin.store.restartTimeout'),
          description: t('admin.store.restartTimeoutDesc'),
          variant: 'destructive',
        });
      }
    };
    
    // Start polling after a brief delay (let server shut down)
    setTimeout(poll, 500);
  }, [toast, t, setIsRebooting]);

  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === currency);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.store.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.store.description')}</p>
        </div>
        
        {/* Server Restart Action - Only shows when restart is needed */}
        {needsReboot && (
          <div className="flex items-center gap-3 shrink-0">
            {rebootStatus === 'idle' && (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleReboot}
                className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90"
              >
                <AlertTriangle className="w-4 h-4" />
                {t('admin.store.restartRequired')}
              </Button>
            )}
            
            {rebootStatus === 'sending' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('admin.store.sendingRestart')}</span>
              </div>
            )}
            
            {rebootStatus === 'waiting' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('admin.store.waitingReconnect')}</span>
              </div>
            )}
            
            {rebootStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>{t('admin.store.restartSuccess')}</span>
              </div>
            )}
            
            {rebootStatus === 'error' && (
              <>
                <span className="text-sm text-destructive">{t('admin.store.restartTimeout')}</span>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('admin.store.reloadManually')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 w-full md:grid-cols-2 grid-cols-1">

        {/* Store Identity */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.store.identity')}</CardTitle>
                  <CardDescription>{t('admin.store.identityDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveIdentity} 
                disabled={savingIdentity}
                size="sm"
                className="gap-2"
              >
                {savingIdentity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="storeName">{t('admin.store.storeName')}</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={t('admin.store.storeNamePlaceholder')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Localization */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.store.localization')}</CardTitle>
                  <CardDescription>{t('admin.store.localizationDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveLocalization} 
                disabled={savingLocalization}
                size="sm"
                className="gap-2"
              >
                {savingLocalization ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.settings.language')}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.settings.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.settings.currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.settings.selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-center font-medium">{option.symbol}</span>
                          <span>{option.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ {t('admin.store.localizationWarning')}
            </p>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.store.branding')}</CardTitle>
                  <CardDescription>{t('admin.store.brandingDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={saveBranding} 
                disabled={savingBranding}
                size="sm"
                className="gap-2"
              >
                {savingBranding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">{t('admin.store.brandName')}</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder={t('admin.store.brandNamePlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('admin.store.brandNameHint')}</p>
            </div>
            
            <div className="space-y-2">
              <Label>{t('admin.store.logo')}</Label>
              <ImageUpload
                type="category"
                value={logoUrl}
                onChange={(url) => setLogoUrl(url)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('admin.store.address')}</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('admin.store.addressPlaceholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t('admin.store.addressHint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment QR Code */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('admin.store.payment')}</CardTitle>
                  <CardDescription>{t('admin.store.paymentDesc')}</CardDescription>
                </div>
              </div>
              <Button 
                onClick={savePaymentSettings} 
                disabled={savingPayment}
                size="sm"
                className="gap-2"
              >
                {savingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('admin.settings.save')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('admin.store.qrImage')}</Label>
              <ImageUpload
                type="category"
                value={qrImageUrl}
                onChange={handleQrImageChange}
              />
              <p className="text-xs text-muted-foreground">{t('admin.store.qrImageHint')}</p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="qr-enabled">{t('admin.store.qrEnabled')}</Label>
                <p className="text-xs text-muted-foreground">
                  {qrImageUrl ? t('admin.store.qrEnabledHint') : t('admin.store.qrDisabledNoImage')}
                </p>
              </div>
              <Switch
                id="qr-enabled"
                checked={qrEnabled}
                onCheckedChange={setQrEnabled}
                disabled={!qrImageUrl}
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
