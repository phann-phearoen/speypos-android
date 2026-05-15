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
  createCategory(data: any): Promise<CompatibilityResult<MenuCategory>>;
  updateCategory(id: string, data: any): Promise<CompatibilityResult<MenuCategory>>;
  deleteCategory(id: string): Promise<CompatibilityResult<any>>;
  getMenuItems(): Promise<CompatibilityResult<MenuItem[]>>;
  createItem(data: any): Promise<CompatibilityResult<MenuItem>>;
  updateItem(id: string, data: any): Promise<CompatibilityResult<MenuItem>>;
  deleteItem(id: string): Promise<CompatibilityResult<any>>;
  getMenuItemCustomizationMappings(): Promise<CompatibilityResult<MenuItemCustomizationGroup[]>>;
  createMenuItemCustomizationMapping(data: any): Promise<CompatibilityResult<any>>;
  deleteMenuItemCustomizationMapping(id: string): Promise<CompatibilityResult<any>>;
  getMenuCategoryCustomizationMappings(): Promise<CompatibilityResult<MenuCategoryCustomizationGroup[]>>;
  createMenuCategoryCustomizationMapping(data: any): Promise<CompatibilityResult<any>>;
  deleteMenuCategoryCustomizationMapping(id: string): Promise<CompatibilityResult<any>>;
  getMenuItemToppingMappings(): Promise<CompatibilityResult<MenuItemToppingGroup[]>>;
  createMenuItemToppingMapping(data: any): Promise<CompatibilityResult<any>>;
  deleteMenuItemToppingMapping(id: string): Promise<CompatibilityResult<any>>;
  getMenuCategoryToppingMappings(): Promise<CompatibilityResult<MenuCategoryToppingGroup[]>>;
  createMenuCategoryToppingMapping(data: any): Promise<CompatibilityResult<any>>;
  deleteMenuCategoryToppingMapping(id: string): Promise<CompatibilityResult<any>>;
  getCustomizationGroups(): Promise<CompatibilityResult<CustomizationOptionGroup[]>>;
  getCustomizationGroupById(groupId: string): Promise<CompatibilityResult<CustomizationOptionGroup>>;
  createCustomizationGroup(data: any): Promise<CompatibilityResult<CustomizationOptionGroup>>;
  updateCustomizationGroup(id: string, data: any): Promise<CompatibilityResult<CustomizationOptionGroup>>;
  deleteCustomizationGroup(id: string): Promise<CompatibilityResult<any>>;
  getCustomizationOptions(): Promise<CompatibilityResult<CustomizationOption[]>>;
  getCustomizationOptionsByGroup(groupId: string): Promise<CompatibilityResult<CustomizationOption[]>>;
  createCustomizationOption(data: any): Promise<CompatibilityResult<CustomizationOption>>;
  updateCustomizationOption(id: string, data: any): Promise<CompatibilityResult<CustomizationOption>>;
  deleteCustomizationOption(id: string): Promise<CompatibilityResult<any>>;
  getToppingGroups(): Promise<CompatibilityResult<ToppingGroup[]>>;
  getToppingGroupById(groupId: string): Promise<CompatibilityResult<ToppingGroup>>;
  createToppingGroup(data: any): Promise<CompatibilityResult<ToppingGroup>>;
  updateToppingGroup(id: string, data: any): Promise<CompatibilityResult<ToppingGroup>>;
  deleteToppingGroup(id: string): Promise<CompatibilityResult<any>>;
  getToppingOptions(): Promise<CompatibilityResult<ToppingOption[]>>;
  getToppingOptionsByGroup(groupId: string): Promise<CompatibilityResult<ToppingOption[]>>;
  createToppingOption(data: any): Promise<CompatibilityResult<ToppingOption>>;
  updateToppingOption(id: string, data: any): Promise<CompatibilityResult<ToppingOption>>;
  deleteToppingOption(id: string): Promise<CompatibilityResult<any>>;
  createMenuItemCategoryMapping(data: any): Promise<CompatibilityResult<any>>;
  deleteMenuItemCategoryMapping(id: string): Promise<CompatibilityResult<any>>;
  getMenuItemCategoryMappings(): Promise<CompatibilityResult<MenuItemCategoryMap[]>>;
}

const httpMenuCompatibilityProvider: MenuCompatibilityProvider = {
  provider: 'http',
  getCategories: () => categoryApi.getCategories(),
  createCategory: (data) => categoryApi.createCategory(data),
  updateCategory: (id, data) => categoryApi.updateCategory(id, data),
  deleteCategory: (id) => categoryApi.deleteCategory(id),
  getMenuItems: () => menuApi.getItems(),
  createItem: (data) => menuApi.createItem(data),
  updateItem: (id, data) => menuApi.updateItem(id, data),
  deleteItem: (id) => menuApi.deleteItem(id),
  getMenuItemCustomizationMappings: () => menuItemCustomizationGroupApi.getAll(),
  createMenuItemCustomizationMapping: (data) => menuItemCustomizationGroupApi.create(data),
  deleteMenuItemCustomizationMapping: (id) => menuItemCustomizationGroupApi.delete(id),
  getMenuCategoryCustomizationMappings: () => menuCategoryCustomizationGroupApi.getAll(),
  createMenuCategoryCustomizationMapping: (data) => menuCategoryCustomizationGroupApi.create(data),
  deleteMenuCategoryCustomizationMapping: (id) => menuCategoryCustomizationGroupApi.delete(id),
  getMenuItemToppingMappings: () => menuItemToppingGroupApi.getAll(),
  createMenuItemToppingMapping: (data) => menuItemToppingGroupApi.create(data),
  deleteMenuItemToppingMapping: (id) => menuItemToppingGroupApi.delete(id),
  getMenuCategoryToppingMappings: () => menuCategoryToppingGroupApi.getAll(),
  createMenuCategoryToppingMapping: (data) => menuCategoryToppingGroupApi.create(data),
  deleteMenuCategoryToppingMapping: (id) => menuCategoryToppingGroupApi.delete(id),
  getCustomizationGroups: () => customizationGroupApi.getAll(),
  getCustomizationGroupById: (groupId: string) => customizationGroupApi.getById(groupId),
  createCustomizationGroup: (data) => customizationGroupApi.create(data),
  updateCustomizationGroup: (id, data) => customizationGroupApi.update(id, data),
  deleteCustomizationGroup: (id) => customizationGroupApi.delete(id),
  getCustomizationOptions: () => customizationOptionApi.getAll(),
  getCustomizationOptionsByGroup: (groupId: string) => customizationOptionApi.getByGroup(groupId),
  createCustomizationOption: (data) => customizationOptionApi.create(data),
  updateCustomizationOption: (id, data) => customizationOptionApi.update(id, data),
  deleteCustomizationOption: (id) => customizationOptionApi.delete(id),
  getToppingGroups: () => toppingGroupApi.getAll(),
  getToppingGroupById: (groupId: string) => toppingGroupApi.getById(groupId),
  createToppingGroup: (data) => toppingGroupApi.create(data),
  updateToppingGroup: (id, data) => toppingGroupApi.update(id, data),
  deleteToppingGroup: (id) => toppingGroupApi.delete(id),
  getToppingOptions: () => toppingOptionApi.getAll(),
  getToppingOptionsByGroup: (groupId: string) => toppingOptionApi.getByGroup(groupId),
  createToppingOption: (data) => toppingOptionApi.create(data),
  updateToppingOption: (id, data) => toppingOptionApi.update(id, data),
  deleteToppingOption: (id) => toppingOptionApi.delete(id),
  createMenuItemCategoryMapping: (data) => categoryMapApi.createMapping(data),
  deleteMenuItemCategoryMapping: (id) => categoryMapApi.deleteMapping(id),
  getMenuItemCategoryMappings: () => categoryMapApi.getMappings(),
};

const nativeMenuCompatibilityProvider: MenuCompatibilityProvider = {
  provider: 'native',
  getCategories: async () => {
    const result = callNativeBridge<MenuCategory[]>('getMenuCategories');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getCategories();
  },
  createCategory: async (data) => {
    const result = callNativeBridge<MenuCategory>('createMenuCategory', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createCategory(data);
  },
  updateCategory: async (id, data) => {
    const result = callNativeBridge<MenuCategory>('updateMenuCategory', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateCategory(id, data);
  },
  deleteCategory: async (id) => {
    const result = callNativeBridge<any>('deleteMenuCategory', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteCategory(id);
  },
  getMenuItems: async () => {
    const result = callNativeBridge<MenuItem[]>('getMenuItems');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuItems();
  },
  createItem: async (data) => {
    const result = callNativeBridge<MenuItem>('createMenuItem', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createItem(data);
  },
  updateItem: async (id, data) => {
    const result = callNativeBridge<MenuItem>('updateMenuItem', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateItem(id, data);
  },
  deleteItem: async (id) => {
    const result = callNativeBridge<any>('deleteMenuItem', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteItem(id);
  },
  getMenuItemCustomizationMappings: async () => {
    const result = callNativeBridge<MenuItemCustomizationGroup[]>('getMenuItemCustomizationMappings');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuItemCustomizationMappings();
  },
  createMenuItemCustomizationMapping: async (data) => {
    const result = callNativeBridge<any>('createMenuItemCustomizationMapping', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createMenuItemCustomizationMapping(data);
  },
  deleteMenuItemCustomizationMapping: async (id) => {
    const result = callNativeBridge<any>('deleteMenuItemCustomizationMapping', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteMenuItemCustomizationMapping(id);
  },
  getMenuCategoryCustomizationMappings: async () => {
    const result = callNativeBridge<MenuCategoryCustomizationGroup[]>('getMenuCategoryCustomizationMappings');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuCategoryCustomizationMappings();
  },
  createMenuCategoryCustomizationMapping: async (data) => {
    const result = callNativeBridge<any>('createMenuCategoryCustomizationMapping', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createMenuCategoryCustomizationMapping(data);
  },
  deleteMenuCategoryCustomizationMapping: async (id) => {
    const result = callNativeBridge<any>('deleteMenuCategoryCustomizationMapping', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteMenuCategoryCustomizationMapping(id);
  },
  getMenuItemToppingMappings: async () => {
    const result = callNativeBridge<MenuItemToppingGroup[]>('getMenuItemToppingMappings');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuItemToppingMappings();
  },
  createMenuItemToppingMapping: async (data) => {
    const result = callNativeBridge<any>('createMenuItemToppingMapping', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createMenuItemToppingMapping(data);
  },
  deleteMenuItemToppingMapping: async (id) => {
    const result = callNativeBridge<any>('deleteMenuItemToppingMapping', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteMenuItemToppingMapping(id);
  },
  getMenuCategoryToppingMappings: async () => {
    const result = callNativeBridge<MenuCategoryToppingGroup[]>('getMenuCategoryToppingMappings');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuCategoryToppingMappings();
  },
  createMenuCategoryToppingMapping: async (data) => {
    const result = callNativeBridge<any>('createMenuCategoryToppingMapping', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createMenuCategoryToppingMapping(data);
  },
  deleteMenuCategoryToppingMapping: async (id) => {
    const result = callNativeBridge<any>('deleteMenuCategoryToppingMapping', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteMenuCategoryToppingMapping(id);
  },
  getCustomizationGroups: async () => {
    const result = callNativeBridge<CustomizationOptionGroup[]>('getCustomizationGroups');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getCustomizationGroups();
  },
  getCustomizationGroupById: async (groupId: string) => {
    const result = callNativeBridge<CustomizationOptionGroup[]>('getCustomizationGroups');
    if (!result.error && result.data) {
      const group = result.data.find((entry) => entry.id === groupId);
      if (group) return { data: group, error: null };
    }
    return httpMenuCompatibilityProvider.getCustomizationGroupById(groupId);
  },
  createCustomizationGroup: async (data) => {
    const result = callNativeBridge<CustomizationOptionGroup>('createCustomizationGroup', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createCustomizationGroup(data);
  },
  updateCustomizationGroup: async (id, data) => {
    const result = callNativeBridge<CustomizationOptionGroup>('updateCustomizationGroup', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateCustomizationGroup(id, data);
  },
  deleteCustomizationGroup: async (id) => {
    const result = callNativeBridge<any>('deleteCustomizationGroup', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteCustomizationGroup(id);
  },
  getCustomizationOptions: async () => {
    const result = callNativeBridge<CustomizationOption[]>('getCustomizationOptions');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getCustomizationOptions();
  },
  getCustomizationOptionsByGroup: async (groupId: string) => {
    const result = callNativeBridge<CustomizationOption[]>('getCustomizationOptions');
    if (!result.error && result.data) {
      return { data: result.data.filter((entry) => entry.customization_group_id === groupId), error: null };
    }
    return httpMenuCompatibilityProvider.getCustomizationOptionsByGroup(groupId);
  },
  createCustomizationOption: async (data) => {
    const result = callNativeBridge<CustomizationOption>('createCustomizationOption', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createCustomizationOption(data);
  },
  updateCustomizationOption: async (id, data) => {
    const result = callNativeBridge<CustomizationOption>('updateCustomizationOption', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateCustomizationOption(id, data);
  },
  deleteCustomizationOption: async (id) => {
    const result = callNativeBridge<any>('deleteCustomizationOption', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteCustomizationOption(id);
  },
  getToppingGroups: async () => {
    const result = callNativeBridge<ToppingGroup[]>('getToppingGroups');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getToppingGroups();
  },
  getToppingGroupById: async (groupId: string) => {
    const result = callNativeBridge<ToppingGroup[]>('getToppingGroups');
    if (!result.error && result.data) {
      const group = result.data.find((entry) => entry.id === groupId);
      if (group) return { data: group, error: null };
    }
    return httpMenuCompatibilityProvider.getToppingGroupById(groupId);
  },
  createToppingGroup: async (data) => {
    const result = callNativeBridge<ToppingGroup>('createToppingGroup', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createToppingGroup(data);
  },
  updateToppingGroup: async (id, data) => {
    const result = callNativeBridge<ToppingGroup>('updateToppingGroup', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateToppingGroup(id, data);
  },
  deleteToppingGroup: async (id) => {
    const result = callNativeBridge<any>('deleteToppingGroup', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteToppingGroup(id);
  },
  getToppingOptions: async () => {
    const result = callNativeBridge<ToppingOption[]>('getToppingOptions');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getToppingOptions();
  },
  getToppingOptionsByGroup: async (groupId: string) => {
    const result = callNativeBridge<ToppingOption[]>('getToppingOptions');
    if (!result.error && result.data) {
      return { data: result.data.filter((entry) => entry.topping_group_id === groupId), error: null };
    }
    return httpMenuCompatibilityProvider.getToppingOptionsByGroup(groupId);
  },
  createToppingOption: async (data) => {
    const result = callNativeBridge<ToppingOption>('createToppingOption', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createToppingOption(data);
  },
  updateToppingOption: async (id, data) => {
    const result = callNativeBridge<ToppingOption>('updateToppingOption', id, JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.updateToppingOption(id, data);
  },
  deleteToppingOption: async (id) => {
    const result = callNativeBridge<any>('deleteToppingOption', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteToppingOption(id);
  },
  createMenuItemCategoryMapping: async (data) => {
    const result = callNativeBridge<any>('createMenuItemCategoryMapping', JSON.stringify(data));
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.createMenuItemCategoryMapping(data);
  },
  deleteMenuItemCategoryMapping: async (id) => {
    const result = callNativeBridge<any>('deleteMenuItemCategoryMapping', id);
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.deleteMenuItemCategoryMapping(id);
  },
  getMenuItemCategoryMappings: async () => {
    const result = callNativeBridge<MenuItemCategoryMap[]>('getMenuItemCategoryMappings');
    if (!result.error) return result;
    return httpMenuCompatibilityProvider.getMenuItemCategoryMappings();
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
