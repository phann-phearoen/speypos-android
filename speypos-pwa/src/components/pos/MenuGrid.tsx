import { ImageOff } from 'lucide-react';
import type { MenuItem } from '@/types/pos';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { resolveImageUrl } from '@/lib/api';
import { triggerImpact } from '@/lib/feedback';

interface MenuGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  loading?: boolean;
  tint?: string;
}

export function MenuGrid({ items, onSelectItem, loading, tint }: MenuGridProps) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  const style = {
    backgroundColor: tint || 'transparent',
    transition: 'background-color 0.5s ease-in-out',
  } as React.CSSProperties;

  if (loading) {
    return (
      <div
        className="flex-1 p-4 grid grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-min pos-scroll"
        style={style}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="menu-item-card animate-pulse">
            <div className="w-16 h-16 rounded-lg bg-muted mb-2" />
            <div className="w-20 h-4 bg-muted rounded" />
            <div className="w-12 h-3 bg-muted/50 rounded mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-muted-foreground"
        style={style}
      >
        <div className="text-center">
          <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">{t('menu.noItems')}</p>
          <p className="text-sm">{t('menu.selectCategory')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 p-4 grid grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-min pos-scroll content-start"
      style={style}
    >
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => {
            triggerImpact('light');
            onSelectItem(item);
          }}
          className="menu-item-card group"
        >
          {/* Image */}
          <div className="w-16 h-16 rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
          {item.image_url ? (
              <img 
                src={resolveImageUrl(item.image_url)} 
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-2xl opacity-30">☕</div>
            )}
          </div>
          
          {/* Name */}
          <span className="text-sm font-medium text-center line-clamp-2 leading-tight">
            {item.name}
          </span>
          
          {/* Price */}
          <span className="text-xs text-muted-foreground mt-1">
            {formatPrice(item.price)}
          </span>

          {/* Active indicator */}
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-active:border-accent transition-colors" />
        </button>
      ))}
    </div>
  );
}
