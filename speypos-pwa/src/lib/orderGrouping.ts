import type { OrderItem, Customization, OrderItemTopping } from '@/types/pos';

export interface VariationGroup {
  signature: string;
  customizations: Customization[];
  toppings: OrderItemTopping[];
  items: OrderItem[];
  totalQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface GroupedOrderItem {
  menuItemId: string;
  menuItemName: string;
  variations: VariationGroup[];
  totalQuantity: number;
  totalSubtotal: number;
}

/**
 * Generate a unique signature for a set of customizations and toppings
 */
export function generateSignature(customizations: Customization[], toppings: OrderItemTopping[] = []): string {
  const customizationKey = customizations.length === 0
    ? ''
    : customizations.map(c => c.id).sort().join('|');
  
  const toppingKey = toppings
    .filter(t => t.quantity > 0)
    .map(t => `${t.topping_option_id}:${t.quantity}`)
    .sort()
    .join('|');
  
  if (!customizationKey && !toppingKey) return '__default__';
  return `${customizationKey}||${toppingKey}`;
}

/**
 * Group order items by base menu item and customization/topping signature
 */
export function groupOrderItems(items: OrderItem[]): GroupedOrderItem[] {
  const baseGroups = new Map<string, {
    menuItemName: string;
    variationMap: Map<string, VariationGroup>;
  }>();

  for (const item of items) {
    const menuItemId = item.menu_item_id;
    const signature = generateSignature(item.customizations, item.toppings || []);

    if (!baseGroups.has(menuItemId)) {
      baseGroups.set(menuItemId, {
        menuItemName: item.menu_item_name,
        variationMap: new Map(),
      });
    }

    const baseGroup = baseGroups.get(menuItemId)!;
    
    if (!baseGroup.variationMap.has(signature)) {
      baseGroup.variationMap.set(signature, {
        signature,
        customizations: item.customizations,
        toppings: item.toppings || [],
        items: [],
        totalQuantity: 0,
        unitPrice: item.unit_price,
        subtotal: 0,
      });
    }

    const variation = baseGroup.variationMap.get(signature)!;
    variation.items.push(item);
    variation.totalQuantity += item.quantity;
    variation.subtotal += item.subtotal;
  }

  // Convert to array and calculate totals
  const result: GroupedOrderItem[] = [];
  
  for (const [menuItemId, baseGroup] of baseGroups) {
    const variations = Array.from(baseGroup.variationMap.values());
    const totalQuantity = variations.reduce((sum, v) => sum + v.totalQuantity, 0);
    const totalSubtotal = variations.reduce((sum, v) => sum + v.subtotal, 0);

    result.push({
      menuItemId,
      menuItemName: baseGroup.menuItemName,
      variations,
      totalQuantity,
      totalSubtotal,
    });
  }

  return result;
}

/**
 * Find an existing item that matches the given menu item, customizations, and toppings
 */
export function findMatchingItem(
  items: OrderItem[],
  menuItemId: string,
  customizations: Customization[],
  toppings: OrderItemTopping[] = []
): OrderItem | undefined {
  const targetSignature = generateSignature(customizations, toppings);
  return items.find(
    item => item.menu_item_id === menuItemId && 
            generateSignature(item.customizations, item.toppings || []) === targetSignature
  );
}
