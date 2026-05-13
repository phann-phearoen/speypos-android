import { staffApi } from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type { Staff } from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

type StaffCreatePayload = {
  name: string;
  password: string;
  role: 'admin' | 'staff';
  status?: 'active' | 'inactive';
  image_url?: string;
};

type StaffUpdatePayload = Partial<{
  name: string;
  password: string;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  image_url: string | null;
}>;

export interface StaffCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getStaff(): Promise<CompatibilityResult<Staff[]>>;
  getStaffMember(staffId: string): Promise<CompatibilityResult<Staff>>;
  createStaff(payload: StaffCreatePayload): Promise<CompatibilityResult<Staff>>;
  updateStaff(staffId: string, payload: StaffUpdatePayload): Promise<CompatibilityResult<Staff>>;
  deleteStaff(staffId: string): Promise<CompatibilityResult<unknown>>;
}

const httpStaffCompatibilityProvider: StaffCompatibilityProvider = {
  provider: 'http',
  getStaff: () => staffApi.getStaff(),
  getStaffMember: (staffId: string) => staffApi.getStaffMember(staffId),
  createStaff: (payload: StaffCreatePayload) => staffApi.createStaff(payload),
  updateStaff: (staffId: string, payload: StaffUpdatePayload) => staffApi.updateStaff(staffId, payload),
  deleteStaff: (staffId: string) => staffApi.deleteStaff(staffId),
};

const nativeStaffCompatibilityProvider: StaffCompatibilityProvider = {
  provider: 'native',
  getStaff: async () => {
    const result = callNativeBridge<Staff[]>('getStaff');
    if (!result.error) {
      return result;
    }

    return httpStaffCompatibilityProvider.getStaff();
  },
  getStaffMember: async (staffId: string) => {
    const result = callNativeBridge<Staff[]>('getStaff');
    if (!result.error && result.data) {
      const staff = result.data.find((entry) => entry.id === staffId);
      if (staff) {
        return { data: staff, error: null };
      }
    }

    return httpStaffCompatibilityProvider.getStaffMember(staffId);
  },
  createStaff: async (payload: StaffCreatePayload) => {
    const result = callNativeBridge<Staff>('createStaff', JSON.stringify(payload));
    if (!result.error) {
      return result;
    }

    return httpStaffCompatibilityProvider.createStaff(payload);
  },
  updateStaff: async (staffId: string, payload: StaffUpdatePayload) => {
    const result = callNativeBridge<Staff>('updateStaff', staffId, JSON.stringify(payload));
    if (!result.error) {
      return result;
    }

    return httpStaffCompatibilityProvider.updateStaff(staffId, payload);
  },
  deleteStaff: async (staffId: string) => {
    const result = callNativeBridge<unknown>('deleteStaff', staffId);
    if (!result.error) {
      return result;
    }

    return httpStaffCompatibilityProvider.deleteStaff(staffId);
  },
};

function resolveProvider(provider: RuntimeApiProvider): StaffCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeStaffCompatibilityProvider;
    case 'http':
    default:
      return httpStaffCompatibilityProvider;
  }
}

export function getStaffCompatibilityProvider(): StaffCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
