import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getMenuCompatibilityProvider } from '@/lib/compatibility/menu';
import type { MenuItem, MenuCategory, MenuItemCustomizationGroup, MenuCategoryCustomizationGroup, MenuItemToppingGroup, MenuCategoryToppingGroup } from '@/types/pos';

interface MenuContextType {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  customizationMappings: MenuItemCustomizationGroup[];
  categoryCustomizationMappings: MenuCategoryCustomizationGroup[];
  toppingMappings: MenuItemToppingGroup[];
  categoryToppingMappings: MenuCategoryToppingGroup[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);
const menuCompatibility = getMenuCompatibilityProvider();

export function MenuProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customizationMappings, setCustomizationMappings] = useState<MenuItemCustomizationGroup[]>([]);
  const [categoryCustomizationMappings, setCategoryCustomizationMappings] = useState<MenuCategoryCustomizationGroup[]>([]);
  const [toppingMappings, setToppingMappings] = useState<MenuItemToppingGroup[]>([]);
  const [categoryToppingMappings, setCategoryToppingMappings] = useState<MenuCategoryToppingGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [catResult, itemResult, mappingResult, categoryMappingResult, toppingMappingResult, categoryToppingMappingResult] = await Promise.all([
      menuCompatibility.getCategories(),
      menuCompatibility.getMenuItems(),
      menuCompatibility.getMenuItemCustomizationMappings(),
      menuCompatibility.getMenuCategoryCustomizationMappings(),
      menuCompatibility.getMenuItemToppingMappings(),
      menuCompatibility.getMenuCategoryToppingMappings(),
    ]);

    if (catResult.error || itemResult.error || mappingResult.error || categoryMappingResult.error || toppingMappingResult.error || categoryToppingMappingResult.error) {
      setError(catResult.error || itemResult.error || mappingResult.error || categoryMappingResult.error || toppingMappingResult.error || categoryToppingMappingResult.error);
    }

    // Sort categories by sort_order, then by name as fallback
    const sortedCategories = (catResult.data || []).sort((a, b) => {
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    setCategories(sortedCategories);
    setMenuItems(itemResult.data || []);
    setCustomizationMappings(mappingResult.data || []);
    setCategoryCustomizationMappings(categoryMappingResult.data || []);
    setToppingMappings(toppingMappingResult.data || []);
    setCategoryToppingMappings(categoryToppingMappingResult.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when tab/window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  return (
    <MenuContext.Provider
      value={{
        categories,
        menuItems,
        customizationMappings,
        categoryCustomizationMappings,
        toppingMappings,
        categoryToppingMappings,
        isLoading,
        error,
        refresh: loadData,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
