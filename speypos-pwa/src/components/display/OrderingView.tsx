import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import type { DisplayOrderItem } from '@/types/pos';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemo } from 'react';
import { groupDisplayItems, type GroupedDisplayItem, type DisplayVariationGroup } from '@/lib/displayOrderGrouping';

interface OrderingViewProps {
  items: DisplayOrderItem[];
  total: number;
}

export function OrderingView({ items, total }: OrderingViewProps) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const groupedItems = useMemo(() => groupDisplayItems(items), [items]);

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">
        {t('display.yourOrder')}
      </h1>

      <ScrollArea className="flex-1 mb-6">
        <div className="space-y-4 pr-4">
          {groupedItems.map((group, index) => (
            <GroupedItemCard
              key={index}
              group={group}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t-2 border-border pt-6">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-foreground">
            {t('display.total')}
          </span>
          <span className="text-4xl font-bold text-primary">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Sub-component for each grouped item
function GroupedItemCard({ group, formatPrice }: { 
  group: GroupedDisplayItem; 
  formatPrice: (amount: number) => string;
}) {
  const isSingleVariation = group.variations.length === 1;
  const singleVariation = isSingleVariation ? group.variations[0] : null;
  const hasNoCustomizations = singleVariation && singleVariation.customizations.length === 0;

  // Single item with no customizations - compact display
  if (isSingleVariation && hasNoCustomizations) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-foreground">{group.name}</span>
            <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              x{singleVariation.totalQuantity}
            </span>
          </div>
          <span className="text-xl font-semibold text-foreground">
            {formatPrice(singleVariation.subtotal)}
          </span>
        </div>
      </div>
    );
  }

  // Multiple variations or has customizations
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      {/* Base item header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-xl font-semibold text-foreground">{group.name}</span>
        <span className="text-xl font-bold text-primary">
          {formatPrice(group.totalSubtotal)}
        </span>
      </div>

      {/* Variations */}
      <div className="space-y-2 pl-4">
        {group.variations.map((variation, idx) => (
          <VariationRow
            key={idx}
            variation={variation}
            formatPrice={formatPrice}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component for each variation
function VariationRow({ variation, formatPrice }: {
  variation: DisplayVariationGroup;
  formatPrice: (amount: number) => string;
}) {
  const customizationText = variation.customizations.length > 0
    ? variation.customizations.map(c => c.name).join(', ')
    : '(default)';

  return (
    <div className="flex items-center justify-between text-base">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{customizationText}</span>
        <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-sm">
          x{variation.totalQuantity}
        </span>
      </div>
      <span className="font-medium text-foreground">{formatPrice(variation.subtotal)}</span>
    </div>
  );
}
