import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface SpeyposNativeBridge {
  getOrders(limit: number): string;
  getAllOrders(): string;
  createOrder(payloadJson: string): string;
  payOrder(orderId: string, payloadJson: string): string;
  voidOrder(orderId: string, payloadJson: string): string;
  printReceipt(orderId: string, mode: string): string;
  getPrintQueueStatus(): string;
  triggerPrintQueueRetry(): string;
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
  createMenuItem(payloadJson: string): string;
  updateMenuItem(itemId: string, payloadJson: string): string;
  deleteMenuItem(itemId: string): string;
  createMenuCategory(payloadJson: string): string;
  updateMenuCategory(categoryId: string, payloadJson: string): string;
  deleteMenuCategory(categoryId: string): string;
  createMenuItemCategoryMapping(payloadJson: string): string;
  deleteMenuItemCategoryMapping(mappingId: string): string;
  getMenuItemCategoryMappings(): string;
  getMenuItemCustomizationMappings(): string;
  getMenuCategoryCustomizationMappings(): string;
  getMenuItemToppingMappings(): string;
  getMenuCategoryToppingMappings(): string;
  getCustomizationGroups(): string;
  getCustomizationOptions(): string;
  createCustomizationGroup(payloadJson: string): string;
  updateCustomizationGroup(id: string, payloadJson: string): string;
  deleteCustomizationGroup(id: string): string;
  createCustomizationOption(payloadJson: string): string;
  updateCustomizationOption(id: string, payloadJson: string): string;
  deleteCustomizationOption(id: string): string;
  getToppingGroups(): string;
  getToppingOptions(): string;
  createToppingGroup(payloadJson: string): string;
  updateToppingGroup(id: string, payloadJson: string): string;
  deleteToppingGroup(id: string): string;
  createToppingOption(payloadJson: string): string;
  updateToppingOption(id: string, payloadJson: string): string;
  deleteToppingOption(id: string): string;
  createMenuItemCustomizationMapping(p: string): string;
  deleteMenuItemCustomizationMapping(id: string): string;
  createMenuCategoryCustomizationMapping(p: string): string;
  deleteMenuCategoryCustomizationMapping(id: string): string;
  createMenuItemToppingMapping(p: string): string;
  deleteMenuItemToppingMapping(id: string): string;
  createMenuCategoryToppingMapping(p: string): string;
  deleteMenuCategoryToppingMapping(id: string): string;
  getSetupStatus(): string;
  getRuntimeStatus(): string;
  getPendingActions(): string;
  getAllSettings(): string;
  upsertSetting(key: string, payloadJson: string): string;
  getCloudSyncSettings(): string;
  updateCloudSyncSettings(payloadJson: string): string;
  performCloudHandshake(payloadJson: string): string;
  syncOrders(shiftId: string): string;
  getStore(): string;
  updateStore(payloadJson: string): string;
  initialize(payloadJson: string): string;
  login(payloadJson: string): string;
  getDeadLetterDetails(): string;
  purgeDeadLetters(): string;
  forceRetryAction(actionId: string): string;
  triggerPendingActionsRetry(): string;
}

type NativeBridgeMethodName = keyof SpeyposNativeBridge;
type NativeBridgeMethodArgs<K extends NativeBridgeMethodName> = Parameters<SpeyposNativeBridge[K]>;

function parseBridgePayload<T>(payload: string, methodName: string): CompatibilityResult<T> {
  const start = performance.now();
  try {
    const parsed = JSON.parse(payload) as CompatibilityResult<T>;
    const parseTime = performance.now() - start;
    if (parseTime > 50) {
        console.warn(`SLOW Bridge Parse [${methodName}]: ${parseTime.toFixed(2)}ms, size: ${payload.length}`);
    }
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
  const start = performance.now();
  if (typeof window === 'undefined' || !window.SpeyposNativeBridge) {
    return {
      data: null,
      error: 'SpeyPOS native bridge is unavailable.',
    };
  }

  try {
    const bridge = window.SpeyposNativeBridge;
    const bridgeMethod = bridge[methodName];
    if (typeof bridgeMethod !== 'function') {
      return {
        data: null,
        error: `Bridge method ${String(methodName)} is missing or not a function`,
      };
    }
    // IMPORTANT: Bridge methods must be called on the bridge object to maintain context
    const result = (bridge[methodName] as any)(...args);
    const bridgeCallTime = performance.now() - start;

    const parsed = parseBridgePayload<T>(result, String(methodName));

    const totalTime = performance.now() - start;
    if (totalTime > 100) {
        console.warn(`SLOW Bridge Call [${methodName}]: ${totalTime.toFixed(2)}ms (bridge: ${bridgeCallTime.toFixed(2)}ms)`);
    }

    return parsed;
  } catch (error) {
    return {
      data: null,
      error: `${String(methodName)} failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
