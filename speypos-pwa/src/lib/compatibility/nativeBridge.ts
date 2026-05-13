import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SpeyposNativeBridge {
  getOrders(): string;
  createOrder(payloadJson: string): string;
  payOrder(orderId: string, payloadJson: string): string;
  voidOrder(orderId: string, payloadJson: string): string;
  printReceipt(orderId: string, mode: string): string;
  getStaff(): string;
  createStaff(payloadJson: string): string;
  updateStaff(staffId: string, payloadJson: string): string;
  deleteStaff(staffId: string): string;
  getShifts(): string;
  openShift(staffId: string): string;
  closeShift(shiftId: string): string;
  closeDay(): string;
  getMenuCategories(): string;
  getMenuItems(): string;
  getMenuItemCustomizationMappings(): string;
  getMenuCategoryCustomizationMappings(): string;
  getMenuItemToppingMappings(): string;
  getMenuCategoryToppingMappings(): string;
  getCustomizationGroups(): string;
  getCustomizationOptions(): string;
  getToppingGroups(): string;
  getToppingOptions(): string;
  getSetupStatus(): string;
  getRuntimeStatus(): string;
  getPendingActions(): string;
  getAllSettings(): string;
  getStore(): string;
}

type NativeBridgeMethodName = keyof SpeyposNativeBridge;
type NativeBridgeMethodArgs<K extends NativeBridgeMethodName> = Parameters<SpeyposNativeBridge[K]>;

function parseBridgePayload<T>(payload: string, methodName: string): CompatibilityResult<T> {
  try {
    const parsed = JSON.parse(payload) as CompatibilityResult<T>;
    return {
      data: parsed.data ?? null,
      error: parsed.error ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: `${methodName} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function callNativeBridge<T, K extends NativeBridgeMethodName>(
  methodName: K,
  ...args: NativeBridgeMethodArgs<K>
): CompatibilityResult<T> {
  if (typeof window === 'undefined' || !window.SpeyposNativeBridge) {
    return {
      data: null,
      error: 'SpeyPOS native bridge is unavailable.',
    };
  }

  try {
    const bridgeMethod = window.SpeyposNativeBridge[methodName] as (...methodArgs: NativeBridgeMethodArgs<K>) => string;
    return parseBridgePayload<T>(bridgeMethod(...args), String(methodName));
  } catch (error) {
    return {
      data: null,
      error: `${String(methodName)} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}