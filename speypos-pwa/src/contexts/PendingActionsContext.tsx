import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSystemCompatibilityProvider } from '@/lib/compatibility/system';
import type { PendingActionsStatus } from '@/types/pos';

interface PendingActionsContextType {
  status: PendingActionsStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  triggerRetry: () => Promise<void>;
  isRetrying: boolean;
}

const PendingActionsContext = createContext<PendingActionsContextType | undefined>(undefined);
const systemCompatibility = getSystemCompatibilityProvider();

export function PendingActionsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PendingActionsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await systemCompatibility.getPendingActions();

    if (result.error) {
      setError(result.error);
    } else {
      setStatus(result.data);
    }

    setIsLoading(false);
  }, []);

  const triggerRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);

    const result = await systemCompatibility.triggerRetry();

    if (result.error) {
      setError(result.error);
      setIsRetrying(false);
      return;
    }

    // Wait for backend to process (202 Accepted means job started, not completed)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Refresh to get updated counts
    await refresh();
    setIsRetrying(false);
  }, [refresh]);

  return (
    <PendingActionsContext.Provider
      value={{
        status,
        isLoading,
        error,
        refresh,
        triggerRetry,
        isRetrying,
      }}
    >
      {children}
    </PendingActionsContext.Provider>
  );
}

export function usePendingActions() {
  const context = useContext(PendingActionsContext);
  if (!context) {
    throw new Error('usePendingActions must be used within a PendingActionsProvider');
  }
  return context;
}
