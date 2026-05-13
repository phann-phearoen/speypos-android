import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';
import { SetupPage } from '@/pages/SetupPage';
import { Loader2 } from 'lucide-react';

interface SetupContextValue {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  isRebooting: boolean;
  setIsRebooting: (value: boolean) => void;
  completeSetup: () => void;
  retryCheck: () => void;
}

const SetupContext = createContext<SetupContextValue | null>(null);
const systemCompatibility = getSystemCompatibilityProvider();

export function SetupProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRebooting, setIsRebooting] = useState(false);

  const checkSetupStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: apiError } = await systemCompatibility.getSetupStatus();
      
      if (apiError) {
        // If backend is unavailable, assume not initialized for setup flow
        console.error('Failed to check setup status:', apiError);
        setError(apiError);
        setIsInitialized(false);
      } else if (data) {
        setIsInitialized(data.initialized);
      }
    } catch (err) {
      console.error('Setup status check failed:', err);
      setError(err instanceof Error ? err.message : 'Network error');
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSetupStatus();
  }, [checkSetupStatus]);

  const completeSetup = useCallback(() => {
    // Trigger a full page reload to reset all state and re-check initialization
    window.location.reload();
  }, []);

  const retryCheck = useCallback(() => {
    checkSetupStatus();
  }, [checkSetupStatus]);

  // Show reboot overlay when rebooting (takes precedence over other states)
  if (isRebooting) {
    return (
      <SetupContext.Provider
        value={{
          isInitialized,
          isLoading,
          error,
          isRebooting,
          setIsRebooting,
          completeSetup,
          retryCheck,
        }}
      >
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Server is restarting...</p>
            <p className="text-muted-foreground">Please wait while we reconnect.</p>
          </div>
        </div>
        {children}
      </SetupContext.Provider>
    );
  }

  // Show loading spinner while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show setup page if not initialized
  if (!isInitialized) {
    return (
      <SetupPage 
        onComplete={completeSetup} 
        connectionError={error}
        onRetry={retryCheck}
      />
    );
  }

  // System is initialized, render normal app
  return (
    <SetupContext.Provider
      value={{
        isInitialized,
        isLoading,
        error,
        isRebooting,
        setIsRebooting,
        completeSetup,
        retryCheck,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
}
