import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CategoryBar } from '@/components/pos/CategoryBar';
import { MenuGrid } from '@/components/pos/MenuGrid';
import { GroupedOrderPanel } from '@/components/pos/GroupedOrderPanel';
import { CustomizationPanel } from '@/components/pos/CustomizationPanel';
import { ShiftClosePreviewModal } from '@/components/pos/ShiftClosePreviewModal';
import { Header } from '@/components/pos/Header';
import { useMenu } from '@/contexts/MenuContext';
import { useShift } from '@/contexts/ShiftContext';
import { usePendingActions } from '@/contexts/PendingActionsContext';
import { useConnectionStatus } from '@/hooks/useApi';
import { useDisplaySession } from '@/hooks/useDisplaySession';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import type { MenuItem, OrderItem, Customization, OrderItemTopping } from '@/types/pos';
import { findMatchingItem } from '@/lib/orderGrouping';
import { getCategoryTint, getCategoryTintDark } from '@/lib/categoryColors';

// Generate unique ID for order items
const generateId = () => Math.random().toString(36).substring(2, 11);

// Interface for incoming state from Payment page
interface LocationState {
  orderItems?: OrderItem[];
  orderTotal?: number;
  customerType?: 'dine-in' | 'take-away';
}

export default function OrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get('shiftId');

  // Get initial state from router if returning from payment page
  const incomingState = location.state as LocationState | null;

  const { isConnected } = useConnectionStatus();
  const { categories, menuItems, customizationMappings, categoryCustomizationMappings, toppingMappings, categoryToppingMappings, isLoading: menuLoading, refresh: refreshMenu } = useMenu();
  const { currentShift, currentStaff, closeShift, isLoading: shiftLoading } = useShift();
  const { refresh: refreshPendingActions } = usePendingActions();
  const { updateToOrdering, updateToIdle } = useDisplaySession();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  // Shift close preview modal state
  const [showClosePreview, setShowClosePreview] = useState(false);

  // Refresh menu data on mount to catch any changes made in admin
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);

  // Local order state (in-progress, not committed to backend)
  // Initialize from router state if available (returning from payment page)
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    () => incomingState?.orderItems || []
  );
  const [lastModifiedItemId, setLastModifiedItemId] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<'dine-in' | 'take-away'>(
    () => incomingState?.customerType || 'take-away'
  );

  // Clear the location state after reading to prevent stale data on refresh
  useEffect(() => {
    if (incomingState?.orderItems) {
      window.history.replaceState({}, document.title);
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Set default category to the one with lowest sort_order when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategory === null) {
      // Categories are already sorted by sort_order in MenuContext
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedItemGroupIds, setSelectedItemGroupIds] = useState<string[]>([]);
  const [selectedItemToppingGroupIds, setSelectedItemToppingGroupIds] = useState<string[]>([]);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [viewState, setViewState] = useState<'menu' | 'customization'>('menu');

  // Calculated values
  const orderTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [orderItems]);

  const itemCount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [orderItems]);

  // Sync order state to customer display (debounced)
  const displayUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Clear any pending update
    if (displayUpdateTimerRef.current) {
      clearTimeout(displayUpdateTimerRef.current);
    }

    // Debounce display updates by 300ms
    displayUpdateTimerRef.current = setTimeout(() => {
      if (orderItems.length > 0) {
        updateToOrdering(orderItems, orderTotal);
      } else {
        updateToIdle();
      }
    }, 300);

    return () => {
      if (displayUpdateTimerRef.current) {
        clearTimeout(displayUpdateTimerRef.current);
      }
    };
  }, [orderItems]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter((item) => item.category_ids?.includes(selectedCategory));
  }, [menuItems, selectedCategory]);

  const categoryTint = useMemo(() => {
    return resolvedTheme === 'dark'
      ? getCategoryTintDark(selectedCategory)
      : getCategoryTint(selectedCategory);
  }, [selectedCategory, resolvedTheme]);

  // Order item management - with auto-merge for matching items
  const addItem = useCallback(
    (menuItem: MenuItem, customizations: Customization[] = [], toppings: OrderItemTopping[] = [], quantity: number = 1) => {
      setOrderItems((prev) => {
        // Check if there's an existing item with the same base + customizations + toppings
        const existingItem = findMatchingItem(prev, menuItem.id, customizations, toppings);
        
        if (existingItem) {
          // Merge: increment quantity of existing item
          setLastModifiedItemId(existingItem.id);
          return prev.map((item) =>
            item.id === existingItem.id
              ? { 
                  ...item, 
                  quantity: item.quantity + quantity, 
                  subtotal: item.unit_price * (item.quantity + quantity) 
                }
              : item
          );
        }
        
        // No match: create new item
        const customizationTotal = customizations.reduce((sum, c) => sum + c.price, 0);
        const toppingTotal = toppings.reduce((sum, t) => sum + t.total_price, 0);
        const unitPrice = menuItem.price + customizationTotal + toppingTotal;

        const newItemId = generateId();
        const newItem: OrderItem = {
          id: newItemId,
          menu_item_id: menuItem.id,
          menu_item_name: menuItem.name,
          quantity,
          unit_price: unitPrice,
          customizations,
          toppings,
          subtotal: unitPrice * quantity,
        };

        setLastModifiedItemId(newItemId);
        return [...prev, newItem];
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }

    setLastModifiedItemId(itemId);
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, subtotal: item.unit_price * quantity }
          : item
      )
    );
  }, []);

  // Remove all items in a variation group
  const removeVariation = useCallback((itemIds: string[]) => {
    setOrderItems((prev) => prev.filter((item) => !itemIds.includes(item.id)));
  }, []);

  // Update quantity for a variation group (delta-based: +1 or -1)
  const updateVariationQuantity = useCallback((itemIds: string[], delta: number) => {
    setOrderItems((prev) => {
      // Find the first item in this variation group
      const targetItem = prev.find((item) => itemIds.includes(item.id));
      if (!targetItem) return prev;

      setLastModifiedItemId(targetItem.id);
      const newQuantity = targetItem.quantity + delta;
      
      if (newQuantity <= 0) {
        // Remove this specific item
        const remaining = prev.filter((item) => item.id !== targetItem.id);
        // If other items exist in the group, they remain
        return remaining;
      }

      // Update the first item's quantity
      return prev.map((item) =>
        item.id === targetItem.id
          ? { ...item, quantity: newQuantity, subtotal: item.unit_price * newQuantity }
          : item
      );
    });
  }, []);

  // Remove all variations of a base menu item
  const removeBaseItem = useCallback((menuItemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.menu_item_id !== menuItemId));
  }, []);

  const clearOrder = useCallback(() => {
    setOrderItems([]);
    setCustomerType('take-away');
    setLastModifiedItemId(null);
  }, []);

  // Navigation handlers
  const handleCheckout = useCallback(() => {
    if (orderItems.length === 0) return;

    // Pass order data via router state
    navigate(`/pos/payment?shiftId=${shiftId}`, {
      state: {
        orderItems,
        orderTotal,
        customerType,
      },
    });
  }, [navigate, shiftId, orderItems, orderTotal, customerType]);

  // Open shift close preview modal instead of closing directly
  const handleCloseShift = useCallback(() => {
    setShowClosePreview(true);
  }, []);

  // Actual shift close (called from modal)
  const handleConfirmCloseShift = useCallback(async () => {
    // Refresh pending actions before closing shift
    await refreshPendingActions();
    
    await closeShift();
    
    toast({
      title: t('shift.closePreview.shiftClosed'),
      description: t('shift.closePreview.shiftClosedDesc').replace('{{name}}', currentStaff?.name || ''),
    });
    
    setShowClosePreview(false);
  }, [closeShift, refreshPendingActions, currentStaff, t]);

  const handleItemSelect = (item: MenuItem) => {
    // Item-level customization groups
    const itemLinkedMappings = customizationMappings.filter((m) => m.menu_item_id === item.id);
    const itemGroupIds = itemLinkedMappings.map((m) => m.customization_group_id);

    // Category-level customization groups (from item's category_ids)
    const categoryIds = item.category_ids || [];
    const categoryLinkedMappings = categoryCustomizationMappings.filter((m) =>
      categoryIds.includes(m.menu_category_id)
    );
    const categoryGroupIds = categoryLinkedMappings.map((m) => m.customization_group_id);

    // Merge + dedupe customization groups
    const linkedGroupIds = Array.from(new Set([...itemGroupIds, ...categoryGroupIds]));

    // Item-level topping groups
    const itemToppingLinkedMappings = toppingMappings.filter((m) => m.menu_item_id === item.id);
    const itemToppingGroupIds = itemToppingLinkedMappings.map((m) => m.topping_group_id);

    // Category-level topping groups
    const categoryToppingLinkedMappings = categoryToppingMappings.filter((m) =>
      categoryIds.includes(m.menu_category_id)
    );
    const categoryToppingGroupIdsFromCategory = categoryToppingLinkedMappings.map((m) => m.topping_group_id);

    // Merge + dedupe topping groups
    const linkedToppingGroupIds = Array.from(new Set([...itemToppingGroupIds, ...categoryToppingGroupIdsFromCategory]));

    if (linkedGroupIds.length > 0 || linkedToppingGroupIds.length > 0) {
      // Has customizations or toppings - open panel
      setSelectedItem(item);
      setSelectedItemGroupIds(linkedGroupIds);
      setSelectedItemToppingGroupIds(linkedToppingGroupIds);
      setViewState('customization');
    } else {
      // No customizations or toppings - add directly to order
      addItem(item, [], [], 1);
    }
  };

  const handleCustomizationConfirm = (customizations: Customization[], toppings: OrderItemTopping[], quantity: number) => {
    if (selectedItem) {
      if (editingOrderItem) {
        // Edit mode: remove old item, add updated one
        removeItem(editingOrderItem.id);
        addItem(selectedItem, customizations, toppings, quantity);
        setEditingOrderItem(null);
      } else {
        // Add mode: just add new item
        addItem(selectedItem, customizations, toppings, quantity);
      }
      handleBack();
    }
  };

  // Add item but keep panel open (for add mode)
  const handleAddItem = (customizations: Customization[], toppings: OrderItemTopping[], quantity: number) => {
    if (selectedItem) {
      addItem(selectedItem, customizations, toppings, quantity);
      // Don't call handleBack - panel stays open
    }
  };

  const handleBack = () => {
    setSelectedItem(null);
    setSelectedItemGroupIds([]);
    setSelectedItemToppingGroupIds([]);
    setEditingOrderItem(null);
    setViewState('menu');
  };

  // Handle edit item - open modal with existing customizations
  const handleEditItem = useCallback((orderItem: OrderItem) => {
    const menuItem = menuItems.find((m) => m.id === orderItem.menu_item_id);
    if (!menuItem) return;

    // Item-level customization groups
    const itemLinkedMappings = customizationMappings.filter((m) => m.menu_item_id === menuItem.id);
    const itemGroupIds = itemLinkedMappings.map((m) => m.customization_group_id);

    // Category-level customization groups
    const categoryIds = menuItem.category_ids || [];
    const categoryLinkedMappings = categoryCustomizationMappings.filter((m) =>
      categoryIds.includes(m.menu_category_id)
    );
    const categoryGroupIds = categoryLinkedMappings.map((m) => m.customization_group_id);

    const linkedGroupIds = Array.from(new Set([...itemGroupIds, ...categoryGroupIds]));

    // Item-level topping groups
    const itemToppingLinkedMappings = toppingMappings.filter((m) => m.menu_item_id === menuItem.id);
    const itemToppingGroupIds = itemToppingLinkedMappings.map((m) => m.topping_group_id);

    // Category-level topping groups
    const categoryToppingLinkedMappings = categoryToppingMappings.filter((m) =>
      categoryIds.includes(m.menu_category_id)
    );
    const categoryToppingGroupIdsFromCategory = categoryToppingLinkedMappings.map((m) => m.topping_group_id);

    const linkedToppingGroupIds = Array.from(new Set([...itemToppingGroupIds, ...categoryToppingGroupIdsFromCategory]));

    setSelectedItem(menuItem);
    setSelectedItemGroupIds(linkedGroupIds);
    setSelectedItemToppingGroupIds(linkedToppingGroupIds);
    setEditingOrderItem(orderItem);
    setViewState('customization');
  }, [menuItems, customizationMappings, categoryCustomizationMappings, toppingMappings, categoryToppingMappings]);

  // Handle duplicate item - add a copy with same customizations and toppings
  const handleDuplicateItem = useCallback((orderItem: OrderItem) => {
    const menuItem = menuItems.find(m => m.id === orderItem.menu_item_id);
    if (!menuItem) return;
    
    addItem(menuItem, orderItem.customizations, orderItem.toppings || [], 1);
  }, [menuItems, addItem]);

  const isLoading = menuLoading || shiftLoading;

  return (
    <div className="h-full flex flex-col bg-background">
      <Header
        currentShift={currentShift}
        currentStaff={currentStaff}
        isConnected={isConnected}
        isLoading={shiftLoading}
        onCloseShift={handleCloseShift}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Menu or Customization Panel */}
        {viewState === 'menu' ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            {/* Horizontal Category Bar */}
            <CategoryBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              loading={isLoading}
            />

            {/* Menu Grid */}
            <MenuGrid
              items={filteredItems}
              onSelectItem={handleItemSelect}
              loading={isLoading}
              tint={categoryTint}
            />
          </div>
        ) : (
          <CustomizationPanel
            item={selectedItem!}
            linkedGroupIds={selectedItemGroupIds}
            linkedToppingGroupIds={selectedItemToppingGroupIds}
            onConfirm={handleCustomizationConfirm}
            onAdd={handleAddItem}
            onBack={handleBack}
            editMode={!!editingOrderItem}
            initialCustomizations={editingOrderItem?.customizations}
            initialToppings={editingOrderItem?.toppings}
            initialQuantity={editingOrderItem?.quantity}
          />
        )}

        {/* Right: Grouped Order Panel */}
        <GroupedOrderPanel
          items={orderItems}
          total={orderTotal}
          itemCount={itemCount}
          lastModifiedItemId={lastModifiedItemId}
          customerType={customerType}
          onChangeCustomerType={setCustomerType}
          onRemoveVariation={removeVariation}
          onUpdateVariationQuantity={updateVariationQuantity}
          onRemoveBaseItem={removeBaseItem}
          onClearOrder={clearOrder}
          onCheckout={handleCheckout}
          onEditVariation={handleEditItem}
        />

        {/* Shift Close Preview Modal */}
        <ShiftClosePreviewModal
          open={showClosePreview}
          onClose={() => setShowClosePreview(false)}
          onConfirm={handleConfirmCloseShift}
          shiftId={currentShift?.id || ''}
          staffName={currentStaff?.name || ''}
        />
      </div>
    </div>
  );
}
