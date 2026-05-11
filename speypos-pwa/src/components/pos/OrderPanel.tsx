import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Pencil, Copy } from 'lucide-react';
import type { OrderItem } from '@/types/pos';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface OrderPanelProps {
  items: OrderItem[];
  total: number;
  itemCount: number;
  customerType: 'dine-in' | 'take-away';
  onChangeCustomerType: (type: 'dine-in' | 'take-away') => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onEditItem: (item: OrderItem) => void;
  onDuplicateItem: (item: OrderItem) => void;
}

export function OrderPanel({
  items,
  total,
  itemCount,
  customerType,
  onRemoveItem,
  onUpdateQuantity,
  onClearOrder,
  onCheckout,
  onEditItem,
  onDuplicateItem,
}: OrderPanelProps) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  return (
    <aside className="w-[400px] bg-pos-panel border-l border-border flex flex-col flex-shrink-0">
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
      <div className="flex-1 pos-scroll p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('order.noItems')}</p>
              <p className="text-xs">{t('order.tapToAdd')}</p>
            </div>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="order-item-row-wide animate-fade-in">
              {/* Top row: Item name + edit/remove buttons */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base">{item.menu_item_name}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onEditItem(item)}
                    className="pos-btn w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted"
                    title={t('common.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="pos-btn w-9 h-9 rounded-lg text-destructive hover:bg-destructive/10"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customizations - displayed as badges */}
              {item.customizations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.customizations.map(c => (
                    <span 
                      key={c.id} 
                      className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground"
                    >
                      {c.name}
                      {c.price > 0 && (
                        <span className="ml-1 text-accent font-medium">
                          +{formatPrice(c.price)}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom row: Price + Quantity controls */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                <div className="text-lg font-bold text-accent">
                  {formatPrice(item.subtotal)}
                </div>

                {/* Quantity Controls + Duplicate */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="pos-btn w-10 h-10 rounded-lg bg-secondary text-secondary-foreground"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="pos-btn w-10 h-10 rounded-lg bg-secondary text-secondary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDuplicateItem(item)}
                    className="pos-btn w-10 h-10 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted ml-1"
                    title="Duplicate item"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
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
