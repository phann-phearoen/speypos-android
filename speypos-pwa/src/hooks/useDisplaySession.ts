import { useCallback, useRef } from 'react';
import { displayApi } from '@/lib/api';
import type { OrderItem, DisplayOrderItem, DisplayScreenState } from '@/types/pos';

/**
 * Hook for updating the customer display session.
 * All updates are fire-and-forget to avoid blocking the POS workflow.
 */
export function useDisplaySession() {
  // Track last sent state to avoid redundant updates
  const lastStateRef = useRef<string>('');

  const updateSession = useCallback(async (data: {
    state: DisplayScreenState;
    items?: DisplayOrderItem[];
    total?: number;
    received_cash?: number;
    change?: number;
    payment_type?: 'cash' | 'qr';
  }) => {
    try {
      // Create a signature to avoid redundant updates
      const signature = JSON.stringify(data);
      if (signature === lastStateRef.current) return;
      lastStateRef.current = signature;

      await displayApi.updateSession(data);
    } catch (error) {
      // Log error but don't throw - display sync is non-critical
      console.warn('Failed to update display session:', error);
    }
  }, []);

  const updateToOrdering = useCallback(async (items: OrderItem[], total: number) => {
    if (items.length === 0) {
      await updateSession({ state: 'IDLE' });
      return;
    }

    // Transform OrderItem[] to DisplayOrderItem[]
    const displayItems: DisplayOrderItem[] = items.map(item => ({
      name: item.menu_item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      customizations: item.customizations.map(c => ({
        name: c.name,
        price: c.price,
      })),
      subtotal: item.subtotal,
    }));

    await updateSession({
      state: 'ORDERING',
      items: displayItems,
      total,
    });
  }, [updateSession]);

  const updateToPaying = useCallback(async (
    total: number,
    receivedCash?: number,
    change?: number,
    paymentType?: 'cash' | 'qr'
  ) => {
    await updateSession({
      state: 'PAYING',
      total,
      received_cash: receivedCash,
      change: change !== undefined && change >= 0 ? change : undefined,
      payment_type: paymentType,
    });
  }, [updateSession]);

  const updateToCompleted = useCallback(async () => {
    await updateSession({ state: 'COMPLETED' });
  }, [updateSession]);

  const updateToIdle = useCallback(async () => {
    lastStateRef.current = ''; // Reset signature to allow future updates
    await updateSession({ state: 'IDLE' });
  }, [updateSession]);

  return {
    updateToOrdering,
    updateToPaying,
    updateToCompleted,
    updateToIdle,
  };
}
