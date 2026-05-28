import { shiftApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Shift, DayClosePreviewResponse } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface ShiftCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getShift(shiftId: string): Promise<CompatibilityResult<Shift>>;
  getOpenShifts(): Promise<CompatibilityResult<Shift[]>>;
  getShiftsByDate(date: string): Promise<CompatibilityResult<Shift[]>>;
  getPreviousDayStatus(): Promise<CompatibilityResult<any>>;
  getCloseDayPreview(date: string): Promise<CompatibilityResult<DayClosePreviewResponse>>;
  openShift(staffId: string): Promise<CompatibilityResult<Shift>>;
  closeShift(shiftId: string): Promise<CompatibilityResult<Shift>>;
  closeDay(date: string): Promise<CompatibilityResult<{ message: string; closed_count?: number }>>;
}

const httpShiftCompatibilityProvider: ShiftCompatibilityProvider = {
  provider: 'http',
  getShift: (shiftId: string) => shiftApi.getShift(shiftId),
  getOpenShifts: () => shiftApi.getOpenShifts(),
  getShiftsByDate: (date: string) => shiftApi.getShiftsByDate(date),
  getPreviousDayStatus: () => shiftApi.getPreviousDayStatus(),
  getCloseDayPreview: (date: string) => shiftApi.getCloseDayPreview(date),
  openShift: (staffId: string) => shiftApi.openShift(staffId),
  closeShift: (shiftId: string) => shiftApi.closeShift(shiftId),
  closeDay: (date: string) => shiftApi.closeDay(date),
};

const nativeShiftCompatibilityProvider: ShiftCompatibilityProvider = {
  provider: 'native',
  getShift: async (shiftId: string) => {
    const shiftsResult = callNativeBridge<Shift[]>('getShifts');
    if (!shiftsResult.error && shiftsResult.data) {
      const shift = shiftsResult.data.find((entry) => entry.id === shiftId) ?? null;
      if (shift) {
        return { data: shift, error: null };
      }
    }

    return httpShiftCompatibilityProvider.getShift(shiftId);
  },
  getOpenShifts: async () => {
    const shiftsResult = callNativeBridge<Shift[]>('getShifts');
    if (!shiftsResult.error && shiftsResult.data) {
      return {
        data: shiftsResult.data.filter((entry) => entry.status === 'open'),
        error: null,
      };
    }

    return httpShiftCompatibilityProvider.getOpenShifts();
  },
  getShiftsByDate: async (date: string) => {
    const shiftsResult = callNativeBridge<Shift[]>('getShifts');
    if (!shiftsResult.error && shiftsResult.data) {
      return {
        data: shiftsResult.data.filter((entry) => entry.date === date),
        error: null,
      };
    }

    return httpShiftCompatibilityProvider.getShiftsByDate(date);
  },
  getPreviousDayStatus: async () => {
    const result = callNativeBridge<any>('getPreviousDayStatus');
    if (!result.error) {
      return result;
    }

    return httpShiftCompatibilityProvider.getPreviousDayStatus();
  },
  getCloseDayPreview: async (date: string) => {
    const result = callNativeBridge<DayClosePreviewResponse>('getCloseDayPreview', date);
    if (!result.error) {
      return result;
    }

    return httpShiftCompatibilityProvider.getCloseDayPreview(date);
  },
  openShift: async (staffId: string) => {
    const result = callNativeBridge<Shift>('openShift', staffId);
    if (!result.error) {
      return result;
    }

    return httpShiftCompatibilityProvider.openShift(staffId);
  },
  closeShift: async (shiftId: string) => {
    const result = callNativeBridge<Shift>('closeShift', shiftId);
    if (!result.error) {
      return result;
    }

    return httpShiftCompatibilityProvider.closeShift(shiftId);
  },
  closeDay: async (date: string) => {
    const result = callNativeBridge<{ message: string; closed_count?: number }>('closeDay', date);
    if (!result.error) {
      return result;
    }

    return httpShiftCompatibilityProvider.closeDay(date);
  },
};

function resolveProvider(provider: RuntimeApiProvider): ShiftCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeShiftCompatibilityProvider;
    case 'http':
    default:
      return httpShiftCompatibilityProvider;
  }
}

export function getShiftCompatibilityProvider(): ShiftCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
