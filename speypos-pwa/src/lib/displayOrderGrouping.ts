import type { DisplayOrderItem } from '@/types/pos';

export interface DisplayVariationGroup {
  signature: string;
  customizations: Array<{ name: string; price: number }>;
  totalQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface GroupedDisplayItem {
  name: string;
  variations: DisplayVariationGroup[];
  totalQuantity: number;
  totalSubtotal: number;
}

// Generate signature from customization names (sorted)
function generateDisplaySignature(customizations: Array<{ name: string; price: number }>): string {
  if (!customizations || customizations.length === 0) return '__default__';
  return customizations
    .map(c => `${c.name}:${c.price}`)
    .sort()
    .join('|');
}

export function groupDisplayItems(items: DisplayOrderItem[]): GroupedDisplayItem[] {
  const groups = new Map<string, {
    variations: Map<string, DisplayVariationGroup>;
  }>();

  for (const item of items) {
    const signature = generateDisplaySignature(item.customizations);

    if (!groups.has(item.name)) {
      groups.set(item.name, { variations: new Map() });
    }

    const group = groups.get(item.name)!;
    
    if (!group.variations.has(signature)) {
      group.variations.set(signature, {
        signature,
        customizations: item.customizations || [],
        totalQuantity: 0,
        unitPrice: item.unit_price,
        subtotal: 0,
      });
    }

    const variation = group.variations.get(signature)!;
    variation.totalQuantity += item.quantity;
    variation.subtotal += item.subtotal;
  }

  // Convert to array
  const result: GroupedDisplayItem[] = [];
  
  for (const [name, group] of groups) {
    const variations = Array.from(group.variations.values());
    result.push({
      name,
      variations,
      totalQuantity: variations.reduce((sum, v) => sum + v.totalQuantity, 0),
      totalSubtotal: variations.reduce((sum, v) => sum + v.subtotal, 0),
    });
  }

  return result;
}
