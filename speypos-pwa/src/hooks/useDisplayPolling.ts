import { useState, useEffect, useRef } from 'react';
import { displayApi } from '@/lib/api';
import type { CustomerDisplayState } from '@/types/pos';

const DEFAULT_STATE: CustomerDisplayState = { state: 'IDLE' };

export function useDisplayPolling(intervalMs: number = 500) {
  const [displayState, setDisplayState] = useState<CustomerDisplayState>(DEFAULT_STATE);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const poll = async () => {
      const { data, error } = await displayApi.getCurrentState();
      if (!mountedRef.current) return;

      if (error) {
        setIsConnected(false);
        // Keep last known state on error (graceful degradation)
      } else if (data) {
        setDisplayState(data);
        setIsConnected(true);
        setLastUpdated(new Date());
      }
    };

    // Initial fetch
    poll();

    // Start polling
    const interval = setInterval(poll, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { displayState, isConnected, lastUpdated };
}
