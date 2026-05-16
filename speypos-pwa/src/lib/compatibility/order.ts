import { orderApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Order } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

type OrderCreatePayload = Record<string, unknown>;
type OrderPaymentPayload = Record<string, unknown>;
type OrderVoidPayload = Record<string, unknown>;
type OrderPrintMode = 'initial' | 'reprint';

export interface OrderCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getOrders(): Promise<CompatibilityResult<Order[]>>;
  getOrder(orderId: string): Promise<CompatibilityResult<Order>>;
  getOrdersByShift(shiftId: string): Promise<CompatibilityResult<Order[]>>;
  getOrdersByStaff(staffId: string): Promise<CompatibilityResult<Order[]>>;
  getOrdersByShiftAndStaff(shiftId: string, staffId: string): Promise<CompatibilityResult<Order[]>>;
  createOrder(payload: OrderCreatePayload): Promise<CompatibilityResult<Order>>;
  payOrder(orderId: string, payload: OrderPaymentPayload): Promise<CompatibilityResult<Order>>;
  voidOrder(orderId: string, payload: OrderVoidPayload): Promise<CompatibilityResult<Order>>;
  printReceipt(orderId: string, mode?: OrderPrintMode): Promise<CompatibilityResult<Order>>;
}

const httpOrderCompatibilityProvider: OrderCompatibilityProvider = {
  provider: 'http',
  getOrders: () => orderApi.getOrders(),
  getOrder: (orderId: string) => orderApi.getOrder(orderId),
  getOrdersByShift: (shiftId: string) => orderApi.getOrdersByShift(shiftId),
  getOrdersByStaff: (staffId: string) => orderApi.getOrdersByStaff(staffId),
  getOrdersByShiftAndStaff: (shiftId: string, staffId: string) =>
    orderApi.getOrdersByShiftAndStaff(shiftId, staffId),
  createOrder: (payload: OrderCreatePayload) => orderApi.createOrder(payload),
  payOrder: (orderId: string, payload: OrderPaymentPayload) => orderApi.payOrder(orderId, payload),
  voidOrder: (orderId: string, payload: OrderVoidPayload) => orderApi.voidOrder(orderId, payload as any),
  printReceipt: (orderId: string) => orderApi.printReceipt(orderId),
};

const nativeOrderCompatibilityProvider: OrderCompatibilityProvider = {
  provider: 'native',
  getOrders: async () => {
    const result = await callNativeBridge<Order[]>('getOrders', 50);
    if (!result.error) {
      return result;
    }

    return httpOrderCompatibilityProvider.getOrders();
  },
  getOrder: async (orderId: string) => {
    const result = callNativeBridge<Order[]>('getOrders', 100);
    if (!result.error && result.data) {
      const order = result.data.find((entry) => entry.id === orderId);
      if (order) {
        return { data: order, error: null };
      }
    }

    return httpOrderCompatibilityProvider.getOrder(orderId);
  },
  getOrdersByShift: async (shiftId: string) => {
    const result = callNativeBridge<Order[]>('getOrders', -1);
    if (!result.error && result.data) {
      return {
        data: result.data.filter((entry) => entry.shift_id === shiftId),
        error: null,
      };
    }

    return httpOrderCompatibilityProvider.getOrdersByShift(shiftId);
  },
  getOrdersByStaff: async (staffId: string) => {
    const result = callNativeBridge<Order[]>('getOrders', -1);
    if (!result.error && result.data) {
      return {
        data: result.data.filter((entry) => entry.staff_id === staffId),
        error: null,
      };
    }

    return httpOrderCompatibilityProvider.getOrdersByStaff(staffId);
  },
  getOrdersByShiftAndStaff: async (shiftId: string, staffId: string) => {
    const result = callNativeBridge<Order[]>('getOrders', -1);
    if (!result.error && result.data) {
      return {
        data: result.data.filter((entry) => entry.shift_id === shiftId && entry.staff_id === staffId),
        error: null,
      };
    }

    return httpOrderCompatibilityProvider.getOrdersByShiftAndStaff(shiftId, staffId);
  },
  createOrder: async (payload: OrderCreatePayload) => {
    const result = callNativeBridge<Order>('createOrder', JSON.stringify(payload));
    if (!result.error) {
      return result;
    }

    return httpOrderCompatibilityProvider.createOrder(payload);
  },
  payOrder: async (orderId: string, payload: OrderPaymentPayload) => {
    const result = callNativeBridge<Order>('payOrder', orderId, JSON.stringify(payload));
    if (!result.error) {
      return result;
    }

    return httpOrderCompatibilityProvider.payOrder(orderId, payload);
  },
  voidOrder: async (orderId: string, payload: OrderVoidPayload) => {
    const result = callNativeBridge<Order>('voidOrder', orderId, JSON.stringify(payload));
    if (!result.error) {
      return result;
    }

    return httpOrderCompatibilityProvider.voidOrder(orderId, payload);
  },
  printReceipt: async (orderId: string, mode: OrderPrintMode = 'initial') => {
    const result = callNativeBridge<Order>('printReceipt', orderId, mode);
    if (!result.error) {
      return result;
    }

    return httpOrderCompatibilityProvider.printReceipt(orderId);
  },
};

function resolveProvider(provider: RuntimeApiProvider): OrderCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeOrderCompatibilityProvider;
    case 'http':
    default:
      return httpOrderCompatibilityProvider;
  }
}

export function getOrderCompatibilityProvider(): OrderCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
