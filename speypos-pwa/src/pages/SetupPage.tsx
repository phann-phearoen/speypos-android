import { useState } from 'react';
import { systemApi } from '@/lib/api';
import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Store, AlertCircle, RefreshCw, Eye, EyeOff, CheckCircle2, Upload } from 'lucide-react';
import { Logo } from '@/components/Logo';

import { useTranslation } from '@/lib/i18n';

interface SetupPageProps {
  onComplete: () => void;
  connectionError: string | null;
  onRetry: () => void;
}

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  storeName?: string;
}

const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'km', name: 'Khmer (ភាសាខ្មែរ)' },
];

const systemCompatibility = getSystemCompatibilityProvider();

type SetupState = 'form' | 'complete' | 'rebooting';

export function SetupPage({ onComplete, connectionError, onRetry }: SetupPageProps) {
  const { t } = useTranslation();
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('KHR');
  const [language, setLanguage] = useState('en');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [setupState, setSetupState] = useState<SetupState>('form');
  const [isImporting, setIsImporting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Store name validation
    if (!storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await systemCompatibility.initialize({
        admin_user: {
          name: username.trim(),
          password: password,
        },
        store: {
          name: storeName.trim(),
          currency: currency,
          language: language,
        },
      });

      if (error) {
        setSubmitError(error);
        setIsSubmitting(false);
        return;
      }

      // Success - show completion screen
      setSetupState('complete');
      setIsSubmitting(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleImportTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setSubmitError(null);

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const { error } = await systemCompatibility.importData(payload);
      if (error) {
        setSubmitError(`Import failed: ${error}`);
        setIsImporting(false);
        return;
      }

      // Success - show completion screen but indicate reboot is needed
      setSetupState('complete');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Invalid JSON file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReboot = async () => {
    setSetupState('rebooting');
    try {
      await systemApi.reboot();
      // Stay in rebooting state - user must manually reload
    } catch (err) {
      // Even if error, stay in rebooting state as server may be restarting
      console.error('Reboot request error:', err);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Setup complete / rebooting screen
  if (setupState === 'complete' || setupState === 'rebooting') {
    return (
      <div className="h-full bg-background flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">Setup Complete</h1>
          <p className="text-muted-foreground mb-8">
            Your SpeyPOS system has been configured successfully.
          </p>

          <Card>
            <CardContent className="pt-6">
              {setupState === 'complete' ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    The server needs to restart to apply the changes.
                  </p>
                  <Button onClick={handleReboot} className="w-full gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Restart Server
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Server is restarting...</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please wait a moment and then reload the page.
                  </p>
                  <Button onClick={handleReload} variant="outline" className="w-full gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" variant="full" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">System Setup</h1>
          <p className="text-muted-foreground mt-2">Configure your SpeyPOS system</p>
        </div>

        {/* Connection error alert */}
        {connectionError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Backend unavailable: {connectionError}</span>
              <Button variant="ghost" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Template Import */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {t('setup.seedTitle')}
            </CardTitle>
            <CardDescription>
              {t('setup.seedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImportTemplate}
                disabled={isImporting || isSubmitting}
              />
              <Button
                variant="outline"
                className="w-full border-dashed border-primary/30 hover:border-primary/50"
                disabled={isImporting || isSubmitting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('setup.seedImporting')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('setup.seedUpload')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Account Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Account
              </CardTitle>
              <CardDescription>
                Create the initial administrator account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
                  }}
                  className={errors.username ? 'border-destructive' : ''}
                  disabled={isSubmitting}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Store Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
              <CardDescription>
                Configure your store details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="Enter store name"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    if (errors.storeName) setErrors(prev => ({ ...prev, storeName: undefined }));
                  }}
                  className={errors.storeName ? 'border-destructive' : ''}
                  disabled={isSubmitting}
                />
                {errors.storeName && (
                  <p className="text-sm text-destructive">{errors.storeName}</p>
                )}
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-center font-medium">{option.symbol}</span>
                          <span>{option.code} - {option.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
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
            </CardContent>
          </Card>

          {/* Submit Error */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </form>

        {/* Footer note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            This setup can only be performed once.
          </p>
        </div>
      </div>
    </div>
  );
}
