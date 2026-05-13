import {
  categoryApi,
  customizationGroupApi,
  customizationOptionApi,
  menuApi,
  menuCategoryCustomizationGroupApi,
  menuCategoryToppingGroupApi,
  menuItemCustomizationGroupApi,
  menuItemToppingGroupApi,
  toppingGroupApi,
  toppingOptionApi,
} from '@/lib/api';
import { callNativeBridge } from '@/lib/compatibility/nativeBridge';
import { getRuntimeApiProvider, type RuntimeApiProvider } from '@/lib/runtime-config';
import type {
  CustomizationOption,
  CustomizationOptionGroup,
  MenuCategory,
  MenuCategoryCustomizationGroup,
  MenuCategoryToppingGroup,
  MenuItem,
  MenuItemCustomizationGroup,
  MenuItemToppingGroup,
  ToppingGroup,
  ToppingOption,
} from '@/types/pos';
import type { CompatibilityResult } from '@/lib/compatibility/types';

export interface MenuCompatibilityProvider {
  readonly provider: RuntimeApiProvider;
  getCategories(): Promise<CompatibilityResult<MenuCategory[]>>;
  getMenuItems(): Promise<CompatibilityResult<MenuItem[]>>;
  getMenuItemCustomizationMappings(): Promise<CompatibilityResult<MenuItemCustomizationGroup[]>>;
  getMenuCategoryCustomizationMappings(): Promise<CompatibilityResult<MenuCategoryCustomizationGroup[]>>;
  getMenuItemToppingMappings(): Promise<CompatibilityResult<MenuItemToppingGroup[]>>;
  getMenuCategoryToppingMappings(): Promise<CompatibilityResult<MenuCategoryToppingGroup[]>>;
  getCustomizationGroupById(groupId: string): Promise<CompatibilityResult<CustomizationOptionGroup>>;
  getCustomizationOptionsByGroup(groupId: string): Promise<CompatibilityResult<CustomizationOption[]>>;
  getToppingGroupById(groupId: string): Promise<CompatibilityResult<ToppingGroup>>;
  getToppingOptionsByGroup(groupId: string): Promise<CompatibilityResult<ToppingOption[]>>;
}

const httpMenuCompatibilityProvider: MenuCompatibilityProvider = {
  provider: 'http',
  getCategories: () => categoryApi.getCategories(),
  getMenuItems: () => menuApi.getItems(),
  getMenuItemCustomizationMappings: () => menuItemCustomizationGroupApi.getAll(),
  getMenuCategoryCustomizationMappings: () => menuCategoryCustomizationGroupApi.getAll(),
  getMenuItemToppingMappings: () => menuItemToppingGroupApi.getAll(),
  getMenuCategoryToppingMappings: () => menuCategoryToppingGroupApi.getAll(),
  getCustomizationGroupById: (groupId: string) => customizationGroupApi.getById(groupId),
  getCustomizationOptionsByGroup: (groupId: string) => customizationOptionApi.getByGroup(groupId),
  getToppingGroupById: (groupId: string) => toppingGroupApi.getById(groupId),
  getToppingOptionsByGroup: (groupId: string) => toppingOptionApi.getByGroup(groupId),
};

const nativeMenuCompatibilityProvider: MenuCompatibilityProvider = {
  provider: 'native',
  getCategories: async () => {
    const result = callNativeBridge<MenuCategory[]>('getMenuCategories');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getCategories();
  },
  getMenuItems: async () => {
    const result = callNativeBridge<MenuItem[]>('getMenuItems');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getMenuItems();
  },
  getMenuItemCustomizationMappings: async () => {
    const result = callNativeBridge<MenuItemCustomizationGroup[]>('getMenuItemCustomizationMappings');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getMenuItemCustomizationMappings();
  },
  getMenuCategoryCustomizationMappings: async () => {
    const result = callNativeBridge<MenuCategoryCustomizationGroup[]>('getMenuCategoryCustomizationMappings');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getMenuCategoryCustomizationMappings();
  },
  getMenuItemToppingMappings: async () => {
    const result = callNativeBridge<MenuItemToppingGroup[]>('getMenuItemToppingMappings');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getMenuItemToppingMappings();
  },
  getMenuCategoryToppingMappings: async () => {
    const result = callNativeBridge<MenuCategoryToppingGroup[]>('getMenuCategoryToppingMappings');
    if (!result.error) {
      return result;
    }

    return httpMenuCompatibilityProvider.getMenuCategoryToppingMappings();
  },
  getCustomizationGroupById: async (groupId: string) => {
    const result = callNativeBridge<CustomizationOptionGroup[]>('getCustomizationGroups');
    if (!result.error && result.data) {
      const group = result.data.find((entry) => entry.id === groupId);
      if (group) {
        return { data: group, error: null };
      }
    }

    return httpMenuCompatibilityProvider.getCustomizationGroupById(groupId);
  },
  getCustomizationOptionsByGroup: async (groupId: string) => {
    const result = callNativeBridge<CustomizationOption[]>('getCustomizationOptions');
    if (!result.error && result.data) {
      return {
        data: result.data.filter((entry) => entry.customization_group_id === groupId),
        error: null,
      };
    }

    return httpMenuCompatibilityProvider.getCustomizationOptionsByGroup(groupId);
  },
  getToppingGroupById: async (groupId: string) => {
    const result = callNativeBridge<ToppingGroup[]>('getToppingGroups');
    if (!result.error && result.data) {
      const group = result.data.find((entry) => entry.id === groupId);
      if (group) {
        return { data: group, error: null };
      }
    }

    return httpMenuCompatibilityProvider.getToppingGroupById(groupId);
  },
  getToppingOptionsByGroup: async (groupId: string) => {
    const result = callNativeBridge<ToppingOption[]>('getToppingOptions');
    if (!result.error && result.data) {
      return {
        data: result.data.filter((entry) => entry.topping_group_id === groupId),
        error: null,
      };
    }

    return httpMenuCompatibilityProvider.getToppingOptionsByGroup(groupId);
  },
};

function resolveProvider(provider: RuntimeApiProvider): MenuCompatibilityProvider {
  switch (provider) {
    case 'native':
      return nativeMenuCompatibilityProvider;
    case 'http':
    default:
      return httpMenuCompatibilityProvider;
  }
}

export function getMenuCompatibilityProvider(): MenuCompatibilityProvider {
  return resolveProvider(getRuntimeApiProvider());
}
