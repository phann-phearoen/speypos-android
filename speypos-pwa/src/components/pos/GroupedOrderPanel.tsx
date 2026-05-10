import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Pencil } from 'lucide-react';
import type { OrderItem } from '@/types/pos';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { groupOrderItems, type GroupedOrderItem, type VariationGroup } from '@/lib/orderGrouping';
import { useMemo } from 'react';

interface GroupedOrderPanelProps {
  items: OrderItem[];
  total: number;
  itemCount: number;
  customerType: 'dine-in' | 'take-away';
  onChangeCustomerType: (type: 'dine-in' | 'take-away') => void;
  onRemoveVariation: (itemIds: string[]) => void;
  onUpdateVariationQuantity: (itemIds: string[], delta: number) => void;
  onRemoveBaseItem: (menuItemId: string) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onEditVariation: (item: OrderItem) => void;
}

export function GroupedOrderPanel({
  items,
  total,
  itemCount,
  onRemoveVariation,
  onUpdateVariationQuantity,
  onRemoveBaseItem,
  onClearOrder,
  onCheckout,
  onEditVariation,
}: GroupedOrderPanelProps) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  const groupedItems = useMemo(() => groupOrderItems(items), [items]);

  return (
    <aside className="w-[550px] bg-pos-panel border-l border-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2 py-1.5">
            <ShoppingBag className="w-5 h-5" />
            {t('order.current')}
          </h2>
          {items.length > 0 && (
            <button
              onClick={onClearOrder}
              className="pos-btn px-3 text-destructive bg-destructive/10 rounded-lg"
            >
              {t('order.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 pos-scroll p-4 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('order.noItems')}</p>
              <p className="text-xs">{t('order.tapToAdd')}</p>
            </div>
          </div>
        ) : (
          groupedItems.map(group => (
            <GroupedItemCard
              key={group.menuItemId}
              group={group}
              formatPrice={formatPrice}
              onRemoveVariation={onRemoveVariation}
              onUpdateVariationQuantity={onUpdateVariationQuantity}
              onRemoveBaseItem={onRemoveBaseItem}
              onEditVariation={onEditVariation}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-sm">{itemCount} {t('order.items')}</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">{t('order.total')}</span>
            <div className="text-2xl font-bold">{formatPrice(total)}</div>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className={`
            w-full pos-btn py-4 rounded-xl font-semibold text-lg gap-2
            ${items.length > 0 
              ? 'bg-accent text-accent-foreground shadow-md' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          {t('order.proceed')}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

interface GroupedItemCardProps {
  group: GroupedOrderItem;
  formatPrice: (amount: number) => string;
  onRemoveVariation: (itemIds: string[]) => void;
  onUpdateVariationQuantity: (itemIds: string[], delta: number) => void;
  onRemoveBaseItem: (menuItemId: string) => void;
  onEditVariation: (item: OrderItem) => void;
}

function GroupedItemCard({
  group,
  formatPrice,
  onRemoveVariation,
  onUpdateVariationQuantity,
  onRemoveBaseItem,
  onEditVariation,
}: GroupedItemCardProps) {
  const isSingleVariation = group.variations.length === 1;
  const singleVariation = isSingleVariation ? group.variations[0] : null;
  const hasNoCustomizations = singleVariation 
    && singleVariation.customizations.length === 0
    && (!singleVariation.toppings || singleVariation.toppings.length === 0);

  // For single variation with no customizations, show compact single row
  if (isSingleVariation && hasNoCustomizations) {
    return (
      <div className="grouped-item-card animate-fade-in">
        <div className="grouped-item-row">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-base truncate">{group.menuItemName}</span>
          </div>
          <VariationControls
            variation={singleVariation}
            formatPrice={formatPrice}
            onRemove={() => onRemoveVariation(singleVariation.items.map(i => i.id))}
            onUpdateQuantity={(delta) => onUpdateVariationQuantity(singleVariation.items.map(i => i.id), delta)}
            onEdit={() => onEditVariation(singleVariation.items[0])}
          />
        </div>
      </div>
    );
  }

  // For items with variations or customizations
  return (
    <div className="grouped-item-card animate-fade-in">
      {/* Base Item Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <span className="font-semibold text-base">{group.menuItemName}</span>
        <div className="flex items-center gap-2">
          <span className="text-accent font-bold">{formatPrice(group.totalSubtotal)}</span>
          <button
            onClick={() => onRemoveBaseItem(group.menuItemId)}
            className="pos-btn w-7 h-7 rounded text-destructive hover:bg-destructive/10"
            title="Remove all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Variation Rows */}
      <div className="pt-2 space-y-1">
        {group.variations.map(variation => (
          <VariationRow
            key={variation.signature}
            variation={variation}
            formatPrice={formatPrice}
            onRemove={() => onRemoveVariation(variation.items.map(i => i.id))}
            onUpdateQuantity={(delta) => onUpdateVariationQuantity(variation.items.map(i => i.id), delta)}
            onEdit={() => onEditVariation(variation.items[0])}
          />
        ))}
      </div>
    </div>
  );
}

interface VariationRowProps {
  variation: VariationGroup;
  formatPrice: (amount: number) => string;
  onRemove: () => void;
  onUpdateQuantity: (delta: number) => void;
  onEdit: () => void;
}

function VariationRow({
  variation,
  formatPrice,
  onRemove,
  onUpdateQuantity,
  onEdit,
}: VariationRowProps) {
  // Build display text combining customizations and toppings
  const customizationParts = variation.customizations.map(c => c.name);
  const toppingParts = (variation.toppings || [])
    .filter(t => t.quantity > 0)
    .map(t => `${t.name} x${t.quantity}`);
  
  const allParts = [...customizationParts, ...toppingParts];
  const variationText = allParts.length > 0 ? allParts.join(', ') : '(default)';

  return (
    <div className="grouped-item-row">
      {/* Customizations */}
      <div className="flex-1 min-w-0 pr-2">
        <span className="text-sm text-muted-foreground truncate block">
          {variationText}
        </span>
      </div>

      <VariationControls
        variation={variation}
        formatPrice={formatPrice}
        onRemove={onRemove}
        onUpdateQuantity={onUpdateQuantity}
        onEdit={onEdit}
      />
    </div>
  );
}

interface VariationControlsProps {
  variation: VariationGroup;
  formatPrice: (amount: number) => string;
  onRemove: () => void;
  onUpdateQuantity: (delta: number) => void;
  onEdit: () => void;
}

function VariationControls({
  variation,
  formatPrice,
  onRemove,
  onUpdateQuantity,
  onEdit,
}: VariationControlsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {/* Quantity */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdateQuantity(-1)}
          className="pos-btn--small w-9 h-9 rounded bg-secondary text-secondary-foreground"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-7 text-center font-bold text-sm">{variation.totalQuantity}</span>
        <button
          onClick={() => onUpdateQuantity(1)}
          className="pos-btn--small w-9 h-9 rounded bg-secondary text-secondary-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Price */}
      <span className="min-w-12 text-right font-medium text-sm text-accent">
        {formatPrice(variation.subtotal)}
      </span>

      {/* Actions */}
      <button
        onClick={onEdit}
        className="pos-btn--small w-8 h-8 rounded text-muted-foreground hover:bg-muted"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onRemove}
        className="pos-btn--small w-8 h-8 rounded text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
