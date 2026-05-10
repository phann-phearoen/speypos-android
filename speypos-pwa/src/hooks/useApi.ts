import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetchFn: () => Promise<{ data: T | null; error: string | null }>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const result = await fetchFn();
    setState({
      data: result.data,
      loading: false,
      error: result.error,
    });
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, dependencies);

  return { ...state, refetch };
}

// Connection status hook
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      // Use Google's generate_204 endpoint - lightweight and reliable
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { isConnected, lastChecked, checkConnection };
}
