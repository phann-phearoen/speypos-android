// API Client for SpeyPOS Local Backend
import type { PendingActionsStatus, RuntimeStatus } from '@/types/pos';
import { getApiBaseUrl, getBackendUrl } from './runtime-config';

const BACKEND_URL = getBackendUrl();
const API_BASE = getApiBaseUrl();

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

interface UploadResponse {
  message: string;
  url: string;
  filename: string;
}

// Helper to resolve image URLs (prepend backend URL for relative paths)
export function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

// Helper to get user role from stored auth
function getStoredUserRole(): string | null {
  try {
    const stored = localStorage.getItem('speypos_admin_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.staff?.role || null;
    }
  } catch {
    return null;
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const timeoutMs =
    options.timeoutMs ?? Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '10000', 10);
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000;

  const controller = new AbortController();
  const externalSignal = options.signal;
  let externalAbortHandler: (() => void) | null = null;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      externalSignal.addEventListener('abort', externalAbortHandler, { once: true });
    }
  }

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, safeTimeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || `HTTP ${response.status}` };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        data: null,
        error: `Request timed out after ${safeTimeoutMs}ms`,
      };
    }

    // Network error or backend unavailable
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
    };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler);
    }
  }
}

// Admin-authenticated request wrapper
async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const userRole = getStoredUserRole();
  
  return request<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      ...(userRole && { 'X-User-Role': userRole }),
    },
  });
}

// Authentication
export const authApi = {
  login: (name: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
};

// Menu Items
export const menuApi = {
  getItems: () => request<any[]>('/menu-item'),
  getItem: (id: string) => request<any>(`/menu-item/${id}`),
  createItem: (data: { name: string; price: number; image_url?: string }) =>
    adminRequest<any>('/menu-item', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateItem: (id: string, data: Partial<{ name: string; price: number; image_url?: string }>) =>
    adminRequest<any>(`/menu-item/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteItem: (id: string) =>
    adminRequest<any>(`/menu-item/${id}`, { method: 'DELETE' }),
};

// Menu Categories
export const categoryApi = {
  getCategories: () => request<any[]>('/menu-category'),
  getCategory: (id: string) => request<any>(`/menu-category/${id}`),
  createCategory: (data: { name: string; image_url?: string; sort_order?: number }) =>
    adminRequest<any>('/menu-category', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<{ name: string; image_url?: string | null; sort_order?: number }>) =>
    adminRequest<any>(`/menu-category/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    adminRequest<any>(`/menu-category/${id}`, { method: 'DELETE' }),
};

// Category Mappings
export const categoryMapApi = {
  getMappings: () => request<any[]>('/menu-item-category-map'),
  getMappingsByCategory: (categoryId: string) =>
    request<any[]>(`/menu-item-category-map?menu_category_id=${categoryId}`),
  createMapping: (data: { menu_item_id: string; menu_category_id: string }) =>
    adminRequest<any>('/menu-item-category-map', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteMapping: (id: string) =>
    adminRequest<any>(`/menu-item-category-map/${id}`, { method: 'DELETE' }),
};

// Staff
export const staffApi = {
  getStaff: () => request<any[]>('/staff'),
  getStaffMember: (id: string) => request<any>(`/staff/${id}`),
  createStaff: (data: { name: string; password: string; role: string; status?: string }) =>
    adminRequest<any>('/staff', {
      method: 'POST',
      body: JSON.stringify({ status: 'active', ...data }),
    }),
  updateStaff: (id: string, data: Partial<{ name: string; password: string; role: string; status: string }>) =>
    adminRequest<any>(`/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteStaff: (id: string) =>
    adminRequest<any>(`/staff/${id}`, { method: 'DELETE' }),
};

// Shifts
export const shiftApi = {
  getShifts: () => request<any[]>('/shift'),
  getShift: (id: string) => request<any>(`/shift/${id}`),
  getShiftsByDate: (date: string) => request<any[]>(`/shift?date=${date}`),
  getOpenShifts: () => request<any[]>('/shift/open'),
  // Backend handles date using store timezone - no date param needed
  openShift: (staffId: string) =>
    request<any>('/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId }),
    }),
  // Backend handles ended_at using store timezone - no timestamp needed
  closeShift: (shiftId: string) =>
    request<any>(`/shift/${shiftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    }),
  // Day close preview - get summary before closing
  getCloseDayPreview: () => request<any>('/shift/close-day'),
  // Close all shifts for the business day
  closeDay: () => request<{ message: string }>('/shift/close-day', { method: 'POST' }),
};

// Orders
export const orderApi = {
  getOrders: () => request<any[]>('/orders'),
  getOrder: (id: string) => request<any>(`/orders/${id}`),
  getOrdersByShift: (shiftId: string) => request<any[]>(`/orders?shift_id=${shiftId}`),
  getOrdersByStaff: (staffId: string) => request<any[]>(`/orders?staff_id=${staffId}`),
  getOrdersByShiftAndStaff: (shiftId: string, staffId: string) => 
    request<any[]>(`/orders?shift_id=${shiftId}&staff_id=${staffId}`),
  createOrder: (order: any) =>
    request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
  payOrder: (orderId: string, payment: any) =>
    request<any>(`/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
  printReceipt: (orderId: string) =>
    request<any>(`/orders/${orderId}/print`, { method: 'POST' }),
  voidOrder: (orderId: string, data: { void_reason: string; void_note?: string; voided_by: string }) =>
    request<any>(`/orders/${orderId}/void`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Customization Option Groups
export const customizationGroupApi = {
  getAll: () => request<any[]>('/customization-option-group'),
  getById: (id: string) => request<any>(`/customization-option-group/${id}`),
  create: (data: { name: string; selection_type: 'single' | 'multiple'; required: boolean; sort_order?: number; default_option_id?: string }) =>
    adminRequest<any>('/customization-option-group', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ name: string; selection_type: 'single' | 'multiple'; required: boolean; sort_order: number; default_option_id: string | null }>) =>
    adminRequest<any>(`/customization-option-group/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/customization-option-group/${id}`, { method: 'DELETE' }),
};

// Customization Options
export const customizationOptionApi = {
  getAll: () => request<any[]>('/customization-option'),
  getByGroup: (groupId: string) =>
    request<any[]>(`/customization-option?customization_group_id=${groupId}`),
  create: (data: { customization_group_id: string; label: string; price_delta: number; sort_order?: number }) =>
    adminRequest<any>('/customization-option', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ label: string; price_delta: number; sort_order: number }>) =>
    adminRequest<any>(`/customization-option/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/customization-option/${id}`, { method: 'DELETE' }),
};

// Menu Item ↔ Customization Group Mappings
export const menuItemCustomizationGroupApi = {
  getAll: () => request<any[]>('/menu-item-customization-group'),
  getByMenuItem: (menuItemId: string) =>
    request<any[]>(`/menu-item-customization-group?menu_item_id=${menuItemId}`),
  create: (data: { menu_item_id: string; customization_group_id: string }) =>
    adminRequest<any>('/menu-item-customization-group', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/menu-item-customization-group/${id}`, { method: 'DELETE' }),
};

// Menu Category ↔ Customization Group Mappings
export const menuCategoryCustomizationGroupApi = {
  getAll: () => request<any[]>('/menu-category-customization-groups'),
  getByCategory: (categoryId: string) =>
    request<any[]>(`/menu-category-customization-groups?menu_category_id=${categoryId}`),
  create: (data: { menu_category_id: string; customization_group_id: string }) =>
    adminRequest<any>('/menu-category-customization-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/menu-category-customization-groups/${id}`, { method: 'DELETE' }),
};

// Topping Groups
export const toppingGroupApi = {
  getAll: () => request<any[]>('/topping-group'),
  getById: (id: string) => request<any>(`/topping-group/${id}`),
  create: (data: { name: string; required: boolean; sort_order: number }) =>
    adminRequest<any>('/topping-group', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{ name: string; required: boolean; sort_order: number }>) =>
    adminRequest<any>(`/topping-group/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/topping-group/${id}`, { method: 'DELETE' }),
};

// Topping Options
export const toppingOptionApi = {
  getAll: () => request<any[]>('/topping-option'),
  getByGroup: (groupId: string) =>
    request<any[]>(`/topping-option?topping_group_id=${groupId}`),
  create: (data: {
    topping_group_id: string;
    label: string;
    unit_label: string;
    unit_price: number;
    min_quantity: number;
    max_quantity: number | null;
    step_quantity: number;
    sort_order: number;
  }) =>
    adminRequest<any>('/topping-option', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<{
    label: string;
    unit_label: string;
    unit_price: number;
    min_quantity: number;
    max_quantity: number | null;
    step_quantity: number;
    sort_order: number;
  }>) =>
    adminRequest<any>(`/topping-option/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/topping-option/${id}`, { method: 'DELETE' }),
};

// Menu Item ↔ Topping Group Mappings
export const menuItemToppingGroupApi = {
  getAll: () => request<any[]>('/menu-item-topping-group'),
  getByMenuItem: (menuItemId: string) =>
    request<any[]>(`/menu-item-topping-group?menu_item_id=${menuItemId}`),
  create: (data: { menu_item_id: string; topping_group_id: string }) =>
    adminRequest<any>('/menu-item-topping-group', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/menu-item-topping-group/${id}`, { method: 'DELETE' }),
};

// Menu Category ↔ Topping Group Mappings
export const menuCategoryToppingGroupApi = {
  getAll: () => request<any[]>('/menu-category-topping-groups'),
  getByCategory: (categoryId: string) =>
    request<any[]>(`/menu-category-topping-groups?menu_category_id=${categoryId}`),
  create: (data: { menu_category_id: string; topping_group_id: string }) =>
    adminRequest<any>('/menu-category-topping-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminRequest<any>(`/menu-category-topping-groups/${id}`, { method: 'DELETE' }),
};

// Upload API (uses multipart/form-data, not JSON)
// Settings
export const settingsApi = {
  getAll: () => request<any[]>('/settings'),
  get: (key: string) => request<any>(`/settings/${key}`),
  upsert: (key: string, data: { value: any; value_type: string; category: string; description?: string }) =>
    adminRequest<any>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// System API (pending actions & recovery)
export const systemApi = {
  getPendingActions: () => request<PendingActionsStatus>('/system/pending-actions'),
  getRuntimeStatus: () => request<RuntimeStatus>('/system/runtime-status'),
  triggerRetry: () => request<null>('/system/retry-jobs', { method: 'POST' }),
  reboot: () => request<{ message: string }>('/system/reboot', { method: 'POST' }),
  exportData: (mode: 'menu' | 'full') => request<any>(`/system/export?mode=${mode}`),
  importData: (payload: any) => request<any>('/system/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

// Health Check API (for reboot polling - uses raw fetch to avoid global error handling)
export const healthApi = {
  check: async (): Promise<ApiResponse<{ status: string }>> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        return { data: null, error: `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch {
      // Silently handle connection errors during reboot
      return { data: null, error: 'Connection refused' };
    }
  },
};

// System Setup API (first-run initialization)
export const setupApi = {
  getStatus: () => request<{ initialized: boolean }>('/system/setup-status'),
  
  initialize: (data: {
    admin_user: { name: string; password: string };
    store: { name: string; language?: string; currency?: string };
  }) => request<{ message: string }>('/setup/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Store API
export const storeApi = {
  get: () => adminRequest<any>('/store'),
  update: (data: {
    name?: string;
    language?: string;
    currency?: string;
    brand_name?: string;
    logo_url?: string;
    address?: string;
    payment_profile?: any;
  }) => adminRequest<any>('/store', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

export const uploadApi = {
  upload: async (type: 'menu' | 'category' | 'staff', file: File): Promise<ApiResponse<UploadResponse>> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const userRole = getStoredUserRole();

      const response = await fetch(`${API_BASE}/upload/${type}`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(userRole && { 'X-User-Role': userRole }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null, error: errorText || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  deleteImage: async (type: string, filename: string): Promise<ApiResponse<null>> => {
    const userRole = getStoredUserRole();
    
    try {
      const response = await fetch(`${API_BASE}/media/${type}/${filename}`, {
        method: 'DELETE',
        headers: {
          ...(userRole && { 'X-User-Role': userRole }),
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        return { data: null, error: errorText || `HTTP ${response.status}` };
      }

      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
};

// Customer Display
export const displayApi = {
  getCurrentState: () => request<any>('/display/current'),
  
  // Update display session (for dual-screen sync)
  updateSession: (data: {
    state: 'IDLE' | 'ORDERING' | 'PAYING' | 'COMPLETED';
    items?: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      customizations: Array<{ name: string; price: number }>;
      subtotal: number;
    }>;
    total?: number;
    received_cash?: number;
    change?: number;
    payment_type?: 'cash' | 'qr';
  }) => request<null>('/display/session', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Cloud Sync
export const syncApi = {
  syncOrders: (shiftId: string) =>
    adminRequest<any>('/sync/orders', {
      method: 'POST',
      body: JSON.stringify({ shift_id: shiftId }),
    }),
};

export { request };
